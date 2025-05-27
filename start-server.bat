@echo off
echo Iniciando Control de Asistencia...

REM Iniciar aplicación con PM2
cd /d "C:\Users\deisl\OneDrive\Documentos\Carrera Ingenieria de Sistemas\Semestre Elec - API\Proyecto Electronica\LectorHuellas\backend"
pm2 start server.js --name "control-asistencia" || pm2 restart control-asistencia

REM Esperar 5 segundos
timeout /t 5

REM Iniciar ngrok
ngrok http 3000

pause