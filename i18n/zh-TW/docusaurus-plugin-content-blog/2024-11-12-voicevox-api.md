---
title: 觀察 VOICEVOX 的 API
authors: hikari
tags: [VoiceVox]
image: /img/blog/2024-11-12-voicevox-api/01.png
---


VOICEVOX 是由編輯器、引擎與核心組成的。

參考: [整體構成](https://github.com/VOICEVOX/voicevox/blob/main/docs/%E5%85%A8%E4%BD%93%E6%A7%8B%E6%88%90.md)

編輯器是應用程式、引擎是 HTTP 伺服器、核心則是執行語音合成處理的模組。

也就是說，編輯器對引擎呼叫 REST API（以下簡稱 API）。

因此這篇文章要觀察這個 API 的內容。

API 的擷取我使用 Wireshark。

## 啟動時的通訊
我用 `http and tcp.port == 50021` 做了過濾，結果如下：

![](/img/blog/2024-11-12-voicevox-api/01.png)

啟動時似乎會讀取以下資訊：
- 版本資訊 `/version`
- 引擎的 manifest 資訊 `/engine_manifest`
- 聲優資訊 `/speakers`（像是 ずんだもん 等角色名單）
- 歌手資訊 `/singers`（同上）

取得 speakers 和 singers 之後，會更詳細地取得各角色的資訊（`/speaker_info?speaker_uuid=xxx`, `/singer_info?speaker_uuid=xxx`）。

## 合成語音請求時的通訊
![](/img/blog/2024-11-12-voicevox-api/04.png)

接著我用 ずんだもん 發送語音合成請求，觀察 API。

![](/img/blog/2024-11-12-voicevox-api/02.png)

語音的取得流程似乎如下：

1. 透過 `/accent_phrases` 取得重音/語調資訊
2. 透過 `/synthesis?speaker=3` 合成 ずんだもん 的聲音

在 (2.) 發送的請求主體看起來和 (1.) 的回應類似，像下面這樣。

因此流程是先在 (1.) 取得重音資訊，接著在 (2.) 依據這些資訊合成語音。

## 實際呼叫 API 試試看
我使用 httpie 這個工具來呼叫 API。

1. 取得 speakers 資訊

![](/img/blog/2024-11-12-voicevox-api/05.png)

可以看到 ずんだもん（Normal）的 id 是 3。

2. 取得重音資訊

我用「ずんだもんなのだ」取得重音資訊。（與取得 speaker 不同，這是用 POST）

![](/img/blog/2024-11-12-voicevox-api/06.png)

3. 合成語音

建立如下的請求主體：

```json
{
  "accent_phrases": <從 /accent_phrases 取得的資料>,
  "speedScale": 1,
  "pitchScale": 0,
  "intonationScale": 1,
  "volumeScale": 1,
  "prePhonemeLength": 0.1,
  "postPhonemeLength": 0.1,
  "outputSamplingRate": 24000,
  "outputStereo": false,
  "kana": ""
}
```

因為 httpie 好像不能處理 wav，所以改用 PowerShell 送請求。

```ps1
# 定義 URL 與 JSON 資料
$url = 'http://localhost:50021/synthesis?speaker=3'
$jsonBody = @"
{
  "accent_phrases": [
    {
      "moras": [
        {
          "text": "ズ",
          "consonant": "z",
          "consonant_length": 0.12722788751125336,
          "vowel": "u",
          "vowel_length": 0.11318323761224747,
          "pitch": 5.773037910461426
        },
        {
          "text": "ン",
          "consonant": null,
          "consonant_length": null,
          "vowel": "N",
          "vowel_length": 0.09306197613477707,
          "pitch": 6.108947277069092
        },
        {
          "text": "ダ",
          "consonant": "d",
          "consonant_length": 0.04249810427427292,
          "vowel": "a",
          "vowel_length": 0.09372275322675705,
          "pitch": 6.09743070602417
        },
        {
          "text": "モ",
          "consonant": "m",
          "consonant_length": 0.07012023776769638,
          "vowel": "o",
          "vowel_length": 0.1172478124499321,
          "pitch": 5.932623386383057
        },
        {
          "text": "ン",
          "consonant": null,
          "consonant_length": null,
          "vowel": "N",
          "vowel_length": 0.06496299058198929,
          "pitch": 5.745952129364014
        },
        {
          "text": "ナ",
          "consonant": "n",
          "consonant_length": 0.038462959229946136,
          "vowel": "a",
          "vowel_length": 0.08576127141714096,
          "pitch": 5.5794854164123535
        }
      ],
      "accent": 1,
      "pause_mora": null,
      "is_interrogative": false
    },
    {
      "moras": [
        {
          "text": "ノ",
          "consonant": "n",
          "consonant_length": 0.05504273623228073,
          "vowel": "o",
          "vowel_length": 0.0903041884303093,
          "pitch": 5.551316261291504
        },
        {
          "text": "ダ",
          "consonant": "d",
          "consonant_length": 0.05024997144937515,
          "vowel": "a",
          "vowel_length": 0.20450790226459503,
          "pitch": 5.633930206298828
        }
      ],
      "accent": 2,
      "pause_mora": null,
      "is_interrogative": false
    }
  ],
  "speedScale": 1,
  "pitchScale": 0,
  "intonationScale": 1,
  "volumeScale": 1,
  "prePhonemeLength": 0.1,
  "postPhonemeLength": 0.1,
  "outputSamplingRate": 24000,
  "outputStereo": false,
  "kana": ""
}
"@

# 建立 HTTP 標頭
$headers = @{
    'Content-Type' = 'application/json'
}

# 發送 POST 請求並取得回應
$response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $jsonBody -OutFile "output.wav"

# 開啟並播放
start output.wav
```

<audio controls src="/assets/wav/voicevox-api/output.wav"></audio>

VOICEVOX：ずんだもん

以上！