/**
 * 氣象資訊抓取與 Markdown 報告產生器
 * 執行方式:
 *   node get_weather.js [城市名稱] [輸出路徑]
 * 範例:
 *   node get_weather.js
 *   node get_weather.js Taipei
 *   node get_weather.js Kaohsiung
 *   node get_weather.js Tokyo
 */

const fs = require('fs');
const path = require('path');

// 取得命令列參數
const location = process.argv[2] || 'Taipei';
// 預設輸出到 weather_md.md，同時支援輸出至 weather_md 資料夾
const outputArg = process.argv[3] || 'weather_md.md';

function getUVLevel(uv) {
  const num = Number(uv) || 0;
  if (num <= 2) return `${num} (低量級)`;
  if (num <= 5) return `${num} (中量級)`;
  if (num <= 7) return `${num} (高量級)`;
  if (num <= 10) return `${num} (過量級)`;
  return `${num} (危險級)`;
}

function getWeatherIcon(desc) {
  const d = (desc || '').toLowerCase();
  if (d.includes('rain') || d.includes('drizzle') || d.includes('雨')) return '🌧️';
  if (d.includes('thunder') || d.includes('雷')) return '⛈️';
  if (d.includes('snow') || d.includes('雪')) return '❄️';
  if (d.includes('cloud') || d.includes('overcast') || d.includes('陰') || d.includes('雲')) return '☁️';
  if (d.includes('sun') || d.includes('clear') || d.includes('晴')) return '☀️';
  if (d.includes('fog') || d.includes('mist') || d.includes('霧')) return '🌫️';
  return '🌤️';
}

function getAdvice(current, today) {
  const temp = Number(current.temp_C);
  const rainDesc = current.weatherDesc?.[0]?.value || '';
  const rainZh = current['lang_zh-tw']?.[0]?.value || current.lang_xx?.[0]?.value || rainDesc;
  const precip = Number(current.precipMM || 0);

  let clothing = '';
  if (temp >= 28) {
    clothing = '天氣炎熱，建議穿著透氣排汗的短袖與輕便衣物，並注意防曬補水。';
  } else if (temp >= 23) {
    clothing = '氣溫舒適宜人，適合著短袖搭配薄外套，早晚溫差時適時增添。';
  } else if (temp >= 18) {
    clothing = '略有涼意，建議著長袖上衣、針織衫或風衣外套。';
  } else if (temp >= 12) {
    clothing = '天氣偏冷，請穿著毛衣、保暖外套或大衣，注意防風保暖。';
  } else {
    clothing = '寒冷低溫，建議多層次穿搭（洋蔥式穿法），並攜帶羽絨衣、圍巾及手套。';
  }

  let umbrella = '';
  if (precip > 0 || rainZh.includes('雨') || rainDesc.toLowerCase().includes('rain')) {
    umbrella = `目前有降雨現象（${rainZh}，累積約 ${precip} mm），外出請務必攜帶雨具並注意路面濕滑。`;
  } else {
    umbrella = '目前無明顯降雨，外出活動方便，但天色變化時仍建議留意最新動態。';
  }

  return { clothing, umbrella };
}

async function fetchWeather(targetLocation) {
  const url = `https://wttr.in/${encodeURIComponent(targetLocation)}?format=j1&lang=zh-tw`;
  console.log(`📡 正在獲取 [${targetLocation}] 的氣象資料...`);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WeatherReportGenerator'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP 請求失敗: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function generateMarkdownReport(data, targetLocation) {
  const current = data.current_condition[0];
  const area = data.nearest_area?.[0] || {};
  const areaName = area.areaName?.[0]?.value || targetLocation;
  const region = area.region?.[0]?.value || '';
  const country = area.country?.[0]?.value || '';
  const lat = area.latitude || '';
  const lon = area.longitude || '';

  const weatherDesc = current['lang_zh-tw']?.[0]?.value || current.lang_xx?.[0]?.value || current.weatherDesc?.[0]?.value || '良好';
  const weatherIcon = getWeatherIcon(weatherDesc);
  const advice = getAdvice(current, data.weather?.[0]);

  const today = data.weather?.[0] || {};
  const todayAstronomy = today.astronomy?.[0] || {};

  const now = new Date();
  const timeString = now.toLocaleString('zh-TW', { timeZoneName: 'short', hour12: false });

  let md = `# ${weatherIcon} ${areaName} 氣象詳細報告\n\n`;
  md += `> 📍 **地區**：${region ? region + ', ' : ''}${country} (${areaName}) [經緯度: ${lat}, ${lon}]\n`;
  md += `> 🕒 **報告產生時間**：${timeString}\n`;
  md += `> 🌐 **資料來源**：wttr.in / WorldWeatherOnline\n\n`;

  md += `## 📌 即時氣象概況\n\n`;
  md += `| 觀測項目 | 數值 | 觀測項目 | 數值 |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **天氣狀態** | ${weatherIcon} ${weatherDesc} | **即時氣溫** | **${current.temp_C}°C** (${current.temp_F}°F) |\n`;
  md += `| **體感溫度** | **${current.FeelsLikeC}°C** | **相對濕度** | ${current.humidity}% |\n`;
  md += `| **降雨量** | ${current.precipMM} mm | **大氣壓力** | ${current.pressure} hPa |\n`;
  md += `| **風向風速** | ${current.winddir16Point} (${current.winddirDegree}°) / ${current.windspeedKmph} km/h | **紫外線指數** | ${getUVLevel(current.uvIndex)} |\n`;
  md += `| **能見度** | ${current.visibility} km | **雲量覆蓋** | ${current.cloudcover}% |\n`;
  md += `| **日出時間** | 🌅 ${todayAstronomy.sunrise || 'N/A'} | **日落時間** | 🌇 ${todayAstronomy.sunset || 'N/A'} |\n`;
  md += `| **月相狀態** | 🌙 ${todayAstronomy.moon_phase || 'N/A'} | **月光照射度** | ${todayAstronomy.moon_illumination || '0'}% |\n\n`;

  md += `## 💡 貼心生活指南\n\n`;
  md += `- 🧥 **穿衣建議**：${advice.clothing}\n`;
  md += `- ☂️ **外出提醒**：${advice.umbrella}\n`;
  md += `- 🌡️ **今日氣溫走勢**：預計最高溫 **${today.maxtempC || '-'}°C**，最低溫 **${today.mintempC || '-'}°C**，日照時間約 **${today.sunHour || '-'} 小時**。\n\n`;

  // 今日逐時預報
  if (today.hourly && today.hourly.length > 0) {
    md += `## 🕒 今日逐時天氣預報\n\n`;
    md += `> 💡 *註：天氣預報與觀測數值會因資料來源不同而有些微差異，僅供參考。*\n\n`;
    md += `| 時間 | 天氣 | 氣溫 | 體感 | 降雨機率 | 降雨量 | 濕度 | 風速 |\n`;
    md += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    
    const times = [];
    const temps = [];
    const rainChances = [];

    for (const h of today.hourly) {
      const hTime = (h.time.padStart(4, '0')).slice(0, 2) + ':00';
      const hDesc = h['lang_zh-tw']?.[0]?.value || h.lang_xx?.[0]?.value || h.weatherDesc?.[0]?.value || '';
      const hIcon = getWeatherIcon(hDesc);
      md += `| ${hTime} | ${hIcon} ${hDesc} | ${h.tempC}°C | ${h.FeelsLikeC}°C | ${h.chanceofrain}% | ${h.precipMM} mm | ${h.humidity}% | ${h.windspeedKmph} km/h |\n`;
      
      times.push(`"${hTime}"`);
      temps.push(Number(h.tempC));
      rainChances.push(Number(h.chanceofrain));
    }
    md += `\n`;

    // 加入 Mermaid 溫度與降雨趨勢圖表
    const minTemp = Math.min(...temps) - 2;
    const maxTemp = Math.max(...temps) + 2;
    md += `### 📈 今日氣溫走勢圖\n\n`;
    md += `\`\`\`mermaid\n`;
    md += `xychart-beta\n`;
    md += `    title "今日氣溫走勢 (°C)"\n`;
    md += `    x-axis [${times.join(', ')}]\n`;
    md += `    y-axis "氣溫 (°C)" ${minTemp} --> ${maxTemp}\n`;
    md += `    line [${temps.join(', ')}]\n`;
    md += `\`\`\`\n\n`;
  }

  // 未來多日預報
  if (data.weather && data.weather.length > 1) {
    md += `## 📅 未來多日天氣趨勢\n\n`;
    md += `| 日期 | 最低溫 / 最高溫 | 平均氣溫 | 紫外線指數 | 日出 / 日落 |\n`;
    md += `| :---: | :---: | :---: | :---: | :---: |\n`;
    for (const d of data.weather) {
      const astro = d.astronomy?.[0] || {};
      md += `| **${d.date}** | 🌡️ ${d.mintempC}°C ~ ${d.maxtempC}°C | ${d.avgtempC}°C | ${getUVLevel(d.uvIndex)} | 🌅 ${astro.sunrise} / 🌇 ${astro.sunset} |\n`;
    }
    md += `\n`;
  }

  md += `---\n*本報告由天氣小助手自動擷取生成。*\n`;
  return md;
}

async function main() {
  try {
    const data = await fetchWeather(location);
    const report = generateMarkdownReport(data, location);

    // 處理輸出路徑
    // 1. 如果 outputArg 是 weather_md (不帶副檔名) 且既有或作為檔案/目錄
    let targetFile = outputArg;
    if (outputArg === 'weather_md') {
      // 建立 weather_md 目錄，並在裡面產生 weather_report.md，同時在當前目錄也產生 weather_md.md
      if (!fs.existsSync('weather_md')) {
        fs.mkdirSync('weather_md', { recursive: true });
      }
      fs.writeFileSync(path.join('weather_md', 'weather_report.md'), report, 'utf-8');
      fs.writeFileSync('weather_md.md', report, 'utf-8');
      console.log(`✅ 報告已成功輸出至:`);
      console.log(`   - weather_md/weather_report.md`);
      console.log(`   - weather_md.md`);
      return;
    }

    const dir = path.dirname(targetFile);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetFile, report, 'utf-8');
    
    // 如果 outputArg 是 weather_md.md，額外建立 weather_md/report.md 方便各種習慣
    if (targetFile === 'weather_md.md') {
      if (!fs.existsSync('weather_md')) {
        fs.mkdirSync('weather_md', { recursive: true });
      }
      fs.writeFileSync(path.join('weather_md', 'README.md'), report, 'utf-8');
      fs.writeFileSync(path.join('weather_md', 'weather_report.md'), report, 'utf-8');
    }

    console.log(`✅ 氣象報告已成功生成至: ${targetFile}`);
  } catch (err) {
    console.error(`❌ 發生錯誤:`, err.message);
    process.exit(1);
  }
}

main();

