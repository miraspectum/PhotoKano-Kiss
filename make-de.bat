robocopy .\original\extracted\00_GMV .\patched\de\cpks\00_GMV /E

node ./scripts/patcher.mjs de
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\original\PCSG00139_patch\eboot.bin .\patched\de\rePatch\PCSG00139\eboot.bin
vita-elf-inject .\patched\de\elf\eboot.bin.elf .\patched\de\rePatch\PCSG00139\eboot.bin
if %errorlevel% neq 0 exit /b %errorlevel%

node ./scripts/gfx-converter.mjs de
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\cpks\00_GMV.csv .\patched\de\cpks\00_GMV.csv
cpkmakec.exe 00_GMV.csv 00_GMV.cpk -dir=.\patched\de\cpks\ -align=2048 -mode=FILENAMEIDGROUP -forcecompress
move /y .\patched\de\cpks\00_GMV.cpk .\patched\de\rePatch\PCSG00139\media\00_GMV.cpk

#rmdir /q /s .\patched\de\cpks\00_GMV
del /F /Q /S .\release\de
xdelta -e -s .\original\PCSG00139_patch\eboot.bin .\patched\de\rePatch\PCSG00139\eboot.bin .\release\de\eboot.xdelta
xdelta -e -s .\original\PCSG00139\media\00_GMV.cpk .\patched\de\rePatch\PCSG00139\media\00_GMV.cpk .\release\de\00_GMV.xdelta

pause