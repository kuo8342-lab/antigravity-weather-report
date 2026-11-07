#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
氣象資訊抓取與 Markdown 報告產生器 (Python 零相依版本)
執行方式:
    python get_weather.py [城市名稱] [輸出路徑]
範例:
    python get_weather.py
    python get_weather.py Taipei
    python get_weather.py Kaohsiung
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

LOCATION = sys.argv[1] if len(sys.argv) > 1 else 'Taipei'
OUTPUT_ARG = sys.argv[2] if len(sys.argv) > 2 else 'weather_md.md'

def get_uv_level(uv_val):
    try:
        num = float(uv_val)
    except (ValueError, TypeError):
        num = 0
    if num <= 2:
        return f"{num:.0f} (低量級)"
    elif num <= 5:
        return f"{num:.0f} (中量級)"
    elif num <= 7:
        return f"{num:.0f} (高量級)"
    elif num <= 10:
        return f"{num:.0f} (過量級)"
    else:
        return f"{num:.0f} (危險級)"

def get_weather_icon(desc):
    d = (desc or '').lower()
    if any(k in d for k in ['rain', 'drizzle', '雨']):
        return '🌧️'
    if any(k in d for k in ['thunder', '雷']):
        return '⛈️'
    if any(k in d for k in ['snow', '雪']):
        return '❄️'
    if any(k in d for k in ['cloud', 'overcast', '陰', '雲']):
        return '☁️'
    if any(k in d for k in ['sun', 'clear', '晴']):
        return '☀️'
    if any(k in d for k in ['fog', 'mist', '霧']):
        return '🌫️'
    return '🌤️'

def get_advice(current):
    try:
        temp = float(current.get('temp_C', 20))
    except (ValueError, TypeError):
        temp = 20.0

    rain_desc = ''
    if current.get('weatherDesc'):
        rain_desc = current['weatherDesc'][0].get('value', '')
    
    rain_zh = rain_desc
    if current.get('lang_zh-tw'):
        rain_zh = current['lang_zh-tw'][0].get('value', rain_desc)

    try:
        precip = float(current.get('precipMM', 0))
    except (ValueError, TypeError):
        precip = 0.0

    if temp >= 28:
        clothing = "天氣炎熱，建議穿著透氣排汗的短袖與輕便衣物，並注意防曬補水。"
    elif temp >= 23:
        clothing = "氣溫舒適宜人，適合著短袖搭配薄外套，早晚溫差時適時增添。"
    elif temp >= 18:
        clothing = "略有涼意，建議著長袖上衣、針織衫或風衣外套。"
    elif temp >= 12:
        clothing = "天氣偏冷，請穿著毛衣、保暖外套或大衣，注意防風保暖。"
    else:
        clothing = "寒冷低溫，建議多層次穿搭（洋蔥式穿法），並攜帶羽絨衣、圍巾及手套。"

    if precip > 0 or '雨' in rain_zh or 'rain' in rain_desc.lower():
        umbrella = f"目前有降雨現象（{rain_zh}，降雨量約 {precip} mm），外出請攜帶雨具並注意安全。"
    else:
        umbrella = "目前無明顯降雨，外出活動方便，但仍建議留意天氣變化。"

    return clothing, umbrella

def fetch_weather(location):
    encoded_loc = urllib.parse.quote(location)
    url = f"https://wttr.in/{encoded_loc}?format=j1&lang=zh-tw"
    print(f"📡 正在獲取 [{location}] 的氣象資料...")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WeatherReportScript/1.0"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def generate_markdown(data, target_location):
    current = data['current_condition'][0]
    area = data.get('nearest_area', [{}])[0]
    area_name = area.get('areaName', [{}])[0].get('value', target_location)
    region = area.get('region', [{}])[0].get('value', '')
    country = area.get('country', [{}])[0].get('value', '')
    lat = area.get('latitude', '')
    lon = area.get('longitude', '')

    weather_desc = ''
    if current.get('lang_zh-tw'):
        weather_desc = current['lang_zh-tw'][0].get('value', '')
    elif current.get('weatherDesc'):
        weather_desc = current['weatherDesc'][0].get('value', '')

    icon = get_weather_icon(weather_desc)
    clothing_advice, umbrella_advice = get_advice(current)

    today = data.get('weather', [{}])[0]
    astro = today.get('astronomy', [{}])[0]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        f"# {icon} {area_name} 氣象詳細報告\n",
        f"> 📍 **地區**：{region + ', ' if region else ''}{country} ({area_name}) [經緯度: {lat}, {lon}]",
        f"> 🕒 **報告產生時間**：{now_str}",
        f"> 🌐 **資料來源**：wttr.in\n",
        "## 📌 即時氣象概況\n",
        "| 觀測項目 | 數值 | 觀測項目 | 數值 |",
        "| :--- | :--- | :--- | :--- |",
        f"| **天氣狀態** | {icon} {weather_desc} | **即時氣溫** | **{current.get('temp_C')}°C** ({current.get('temp_F')}°F) |",
        f"| **體感溫度** | **{current.get('FeelsLikeC')}°C** | **相對濕度** | {current.get('humidity')}% |",
        f"| **降雨量** | {current.get('precipMM')} mm | **大氣壓力** | {current.get('pressure')} hPa |",
        f"| **風向風速** | {current.get('winddir16Point')} ({current.get('winddirDegree')}°) / {current.get('windspeedKmph')} km/h | **紫外線指數** | {get_uv_level(current.get('uvIndex'))} |",
        f"| **能見度** | {current.get('visibility')} km | **雲量覆蓋** | {current.get('cloudcover')}% |",
        f"| **日出時間** | 🌅 {astro.get('sunrise', 'N/A')} | **日落時間** | 🌇 {astro.get('sunset', 'N/A')} |",
        f"| **月相狀態** | 🌙 {astro.get('moon_phase', 'N/A')} | **月光照射度** | {astro.get('moon_illumination', '0')}% |\n",
        "## 💡 貼心生活指南\n",
        f"- 🧥 **穿衣建議**：{clothing_advice}",
        f"- ☂️ **外出提醒**：{umbrella_advice}",
        f"- 🌡️ **今日氣溫走勢**：預計最高溫 **{today.get('maxtempC', '-')}°C**，最低溫 **{today.get('mintempC', '-')}°C**，日照時間約 **{today.get('sunHour', '-')} 小時**。\n"
    ]

    # 今日逐時
    hourly = today.get('hourly', [])
    if hourly:
        lines.append("## 🕒 今日逐時天氣預報\n")
        lines.append("> 💡 *註：天氣預報與觀測數值會因資料來源不同而有些微差異，僅供參考。\n")
        lines.append("| 時間 | 天氣 | 氣溫 | 體感 | 降雨機率 | 降雨量 | 濕度 | 風速 |")
        lines.append("| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
        for h in hourly:
            t_str = f"{int(h.get('time', 0)):04d}"[:2] + ":00"
            h_desc = (h.get('lang_zh-tw', [{}])[0].get('value') or 
                      h.get('weatherDesc', [{}])[0].get('value', ''))
            h_icon = get_weather_icon(h_desc)
            lines.append(f"| {t_str} | {h_icon} {h_desc} | {h.get('tempC')}°C | {h.get('FeelsLikeC')}°C | {h.get('chanceofrain')}% | {h.get('precipMM')} mm | {h.get('humidity')}% | {h.get('windspeedKmph')} km/h |")
        lines.append("")

    # 未來預報
    forecast = data.get('weather', [])
    if len(forecast) > 1:
        lines.append("## 📅 未來多日天氣趨勢\n")
        lines.append("| 日期 | 最低溫 / 最高溫 | 平均氣溫 | 紫外線指數 | 日出 / 日落 |")
        lines.append("| :---: | :---: | :---: | :---: | :---: |")
        for d in forecast:
            d_astro = d.get('astronomy', [{}])[0]
            lines.append(f"| **{d.get('date')}** | 🌡️ {d.get('mintempC')}°C ~ {d.get('maxtempC')}°C | {d.get('avgtempC')}°C | {get_uv_level(d.get('uvIndex'))} | 🌅 {d_astro.get('sunrise')} / 🌇 {d_astro.get('sunset')} |")
        lines.append("")

    lines.append("---\n*本報告由天氣小助手自動擷取生成。*\n")
    return "\n".join(lines)

def main():
    try:
        data = fetch_weather(LOCATION)
        report = generate_markdown(data, LOCATION)

        target_file = OUTPUT_ARG
        if target_file == 'weather_md':
            os.makedirs('weather_md', exist_ok=True)
            with open(os.path.join('weather_md', 'weather_report.md'), 'w', encoding='utf-8') as f:
                f.write(report)
            with open('weather_md.md', 'w', encoding='utf-8') as f:
                f.write(report)
            print("✅ 報告已成功輸出至:")
            print("   - weather_md/weather_report.md")
            print("   - weather_md.md")
            return

        parent = os.path.dirname(target_file)
        if parent:
            os.makedirs(parent, exist_ok=True)

        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(report)

        if target_file == 'weather_md.md':
            os.makedirs('weather_md', exist_ok=True)
            with open(os.path.join('weather_md', 'README.md'), 'w', encoding='utf-8') as f:
                f.write(report)
            with open(os.path.join('weather_md', 'weather_report.md'), 'w', encoding='utf-8') as f:
                f.write(report)

        print(f"✅ 氣象報告已成功生成至: {target_file}")
    except Exception as e:
        print(f"❌ 發生錯誤: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

