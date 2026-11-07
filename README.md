# 氣象資訊與報告產生器 (Weather Report Generator)

這是一個可以自動取得即時氣象資訊，並自動排版整理成 Markdown 格式報告的工具。

- **免 API Key**：直接使用全球氣象資料服務（wttr.in）
- **雙語言支援**：提供 **Node.js** 與 **Python** 兩種實作版本（皆為零額外依賴）
- **客製化地點**：支援台灣各縣市（台北、高雄、台中、台南等）或全球各大城市
- **自動輸出**：產生排版精美的 Markdown 報告至 `weather_md.md` 以及 `weather_md/` 資料夾

---

## 🚀 快速開始

### 1. 使用 Node.js 執行（建議，開箱即用）

```bash
# 預設抓取台北 (Taipei) 氣象並輸出報告
node get_weather.js

# 抓取指定城市（例如：高雄、台中、東京、紐約等）
node get_weather.js Kaohsiung
node get_weather.js Tokyo
node get_weather.js London

# 指定輸出檔名或路徑
node get_weather.js Taipei my_weather.md
```

### 2. 使用 Python 執行

```bash
# 預設抓取台北氣象
python get_weather.py

# 抓取指定城市
python get_weather.py Kaohsiung
```

---

## 📁 輸出檔案說明

執行後會自動產生以下報告：
- [`weather_md.md`](./weather_md.md)：單一 Markdown 報告檔案
- [`weather_md/weather_report.md`](./weather_md/weather_report.md)：存放於資料夾內的報告

---

## 📊 報告包含內容

1. **即時氣象概況**：氣溫、體感溫度、天氣狀態、濕度、累積降雨量、風向與風速、紫外線指數、氣壓、能見度、日出/日落時間、月相等。
2. **貼心生活指南**：根據當前溫度與降雨提供穿衣建議與外出提醒。
3. **今日逐時天氣預報**：00:00 ~ 21:00 每三小時的氣溫、體感、降雨機率與降雨量走勢（附註明資訊與走勢圖）。
4. **未來多日趨勢**：未來數日的氣溫區間、平均溫、紫外線指數與日出日落。

