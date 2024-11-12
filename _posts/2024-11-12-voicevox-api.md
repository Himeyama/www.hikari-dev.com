---
layout: post
title: VOICEVOX の API を観察してみる
tags: [VOICEVOX, API]
---


VOICEVOX はエディターとエンジンとコアで構成されているとあります。

参考: [全体構成](https://github.com/VOICEVOX/voicevox/blob/main/docs/%E5%85%A8%E4%BD%93%E6%A7%8B%E6%88%90.md)

エディターがアプリで、エンジンが http サーバー、コアが音声合成の処理を行うモジュールになっているらしいです。

つまり、エディターがエンジンに対して REST API (以下 API) を叩いているというわけですね。

というわけで、その API の内容を観察してみようという記事になります。

API のキャプチャーには Wireshark を用いました。

## 起動時の通信
`http and tcp.port == 50021` でフィルターをかけてみた結果が、こちら。

![](/assets/img/voicevox-api/01.png)

起動時には以下の情報を読み取っているようです。
- バージョン情報 `/version` 
- エンジンのマニフェスト情報 `/engine_manifest` 
- スピーカー情報 `/speakers` (ずんだもんなどのキャラクターリスト) 
- シンガー情報 `/singers` (〃) 

スピーカー・シンガー取得後は各キャラクターの情報をより詳細に取得しているようですね。(`/speaker_info?speaker_uuid=xxx`, `/singer_info?speaker_uuid=xxx`)

## 音声合成リクエスト時の通信
![](/assets/img/voicevox-api/04.png)

では実際にずんだもんで音声合成のリクエストを送って、API を覗いてみました。

![](/assets/img/voicevox-api/02.png)

以下のような流れで音声が取得されているみたいです。

1. `/accent_phrases` でアクセントの情報
2. `/synthesis?speaker=3` でずんだもんの声を合成

(2.) で送っているリクエストボディの内容は、以下のように (1.) のレスポンスと似たようなものになっています。

したがって、(1.) でアクセントを取得し、(2.) でアクセントから音声を合成するという流れのようです。

## 実際に API を叩いてみる
httpie というツールを用いて API を叩きました。

1. スピーカー情報を取得

![](/assets/img/voicevox-api/05.png)

ずんだもん (ノーマル) の id は 3 であることがわかりました。

2. アクセント情報を取得

`ずんだもんなのだ` でアクセント情報を取得してみました。
(スピーカー情報と異なり、POST リクエストで取得)

![](/assets/img/voicevox-api/06.png)

3. 音声合成

以下のようなリクエストボディーを作成します。

```json
{
  "accent_phrases": </accent_phrases で取得したデータ>,
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

httpie では wav が扱えないようなので、PowerShell でリクエストを送ります。

```ps1
# URLとJSONデータを定義
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

# HTTPヘッダーを作成
$headers = @{
    'Content-Type' = 'application/json'
}

# POSTリクエストを送信し、レスポンスを取得
$response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $jsonBody -OutFile "output.wav"

# 開いて再生
start output.wav
```

<audio controls src="/assets/wav/voicevox-api/output.wav"></audio>

VOICEVOX: ずんだもん

以上！