robocopy .\original\extracted\00_GMV .\patched\ru\cpks\00_GMV /E

node ./scripts/patcher.mjs ru
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\original\PCSG00139_patch\eboot.bin .\patched\ru\rePatch\PCSG00139\eboot.bin
vita-elf-inject .\patched\ru\elf\eboot.bin.elf .\patched\ru\rePatch\PCSG00139\eboot.bin
if %errorlevel% neq 0 exit /b %errorlevel%

node ./scripts/gfx-converter.mjs ru
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\cpks\00_GMV.csv .\patched\ru\cpks\00_GMV.csv
cpkmakec.exe 00_GMV.csv 00_GMV.cpk -dir=.\patched\ru\cpks\ -align=2048 -mode=FILENAMEIDGROUP -forcecompress
move /y .\patched\ru\cpks\00_GMV.cpk .\patched\ru\rePatch\PCSG00139\media\00_GMV.cpk

#rmdir /q /s .\patched\ru\cpks\00_GMV
del /F /Q /S .\release\ru
xdelta -e -s .\original\PCSG00139_patch\eboot.bin .\patched\ru\rePatch\PCSG00139\eboot.bin .\release\ru\eboot.xdelta
xdelta -e -s .\original\PCSG00139\media\00_GMV.cpk .\patched\ru\rePatch\PCSG00139\media\00_GMV.cpk .\release\ru\00_GMV.xdelta

pause