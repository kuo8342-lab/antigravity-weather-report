@echo off
chcp 65001 > nul
echo 正在更新氣象報告...
node "%~dp0get_weather.js" %*
echo.
echo 更新完成！報告已儲存至 weather_md.md
pause

