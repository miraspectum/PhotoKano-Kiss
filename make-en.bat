robocopy .\original\extracted\00_GMV .\patched\en\cpks\00_GMV /E

node ./scripts/patcher.mjs en
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\original\PCSG00139_patch\eboot.bin .\patched\en\rePatch\PCSG00139\eboot.bin
vita-elf-inject .\patched\en\elf\eboot.bin.elf .\patched\en\rePatch\PCSG00139\eboot.bin
if %errorlevel% neq 0 exit /b %errorlevel%

node ./scripts/gfx-converter.mjs en
if %errorlevel% neq 0 exit /b %errorlevel%

copy /y .\cpks\00_GMV.csv .\patched\en\cpks\00_GMV.csv
cpkmakec.exe 00_GMV.csv 00_GMV.cpk -dir=.\patched\en\cpks\ -align=2048 -mode=FILENAMEIDGROUP -forcecompress
move /y .\patched\en\cpks\00_GMV.cpk .\patched\en\rePatch\PCSG00139\media\00_GMV.cpk

#rmdir /q /s .\patched\en\cpks\00_GMV
del /F /Q /S .\release\en
xdelta -e -s .\original\PCSG00139_patch\eboot.bin .\patched\en\rePatch\PCSG00139\eboot.bin .\release\en\eboot.xdelta
xdelta -e -s .\original\PCSG00139\media\00_GMV.cpk .\patched\en\rePatch\PCSG00139\media\00_GMV.cpk .\release\en\00_GMV.xdelta

pause