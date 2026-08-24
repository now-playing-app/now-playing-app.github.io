# 🎵 Now Playing Hub

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-Fast-purple?style=for-the-badge&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Supabase-Realtime-green?style=for-the-badge&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Spotify-API-1DB954?style=for-the-badge&logo=spotify" alt="Spotify">
</p>

あなたのSpotifyでの「今聴いている音楽」をリアルタイムでシェアし、音楽仲間とつながる次世代のソーシャル音楽プラットフォームです。

---

## 🚀 主な機能 (Features)

* **🎧 Spotifyリアルタイム楽曲同期**  
  現在再生中の楽曲（高解像度アートワーク、曲名、アーティスト名、アルバム名）を数秒おきに自動でフェッチして表示します。
* **🎤 トップアーティスト表示**  
  ユーザーが普段ヘビロテしているお気に入りのアーティスト一覧をカルーセル形式でリッチに表示します。
* **💬 コミュニティチャット**  
  Supabase Realtimeを活用し、音楽好きの仲間たちとリアルタイムでメッセージを交わせるプレビュー版チャット機能です。
* **💳 クーポン自動適用システム**  
  URLパラメータ（例: `?coupon=SUMMER2026`）や専用フォームからの入力によって、プレミアムクーポンを即座に判定・適用できます。
* **👑 管理者（VIP）専用ダッシュボード**  
  特定の管理者権限を持つアカウントのみアクセス可能な裏画面。クーポンの発行・削除などの管理オペレーションが可能です。
* **📄 各種法的ページ・フッター**  
  特定商取引法に基づく表記、プライバシーポリシー、利用規約のモーダル・アラートを完備し、サービスとしての信頼性を担保しています。

---

## 🛠️ 使用技術 (Tech Stack)

* **Frontend:** React, TypeScript, Vite
* **Styling:** Modern Inline CSS (Spotify Dark Theme: `#121212`, `#1db954`)
* **API / Backend:** Spotify Web API (OAuth 2.0 Authorization Code Flow), Supabase (Database & Realtime Websockets)
* **Deployment & CI/CD:** GitHub Pages & GitHub Actions

---

## 💻 開発環境のセットアップ (Getting Started)

お手元のローカル環境で動かしてみたい場合は、以下の手順に従ってください。

### 1. リポジトリのクローン
```bash
git clone https://github.com/now-playing-app/now-playing-app.github.io.git
cd music-share
2. 依存関係のインストール
Bash
npm install
3. 開発サーバーの起動
Bash
npm run dev
4. ブラウザでアクセス
起動後、ターミナルに表示されるURL（通常は http://localhost:5173/）にアクセスしてください。

🗺️ ロードマップ (Roadmap)
[x] Spotify認証と基本の楽曲取得

[x] ダークテーマベースのUIリニューアル

[x] コミュニティチャット（リアルタイム）の実装

[x] 管理者ダッシュボードおよびクーポン機能の追加

[ ] ユーザー同士のフレンドフォロー機能

[ ] プレイリストの共有・レコメンド機能の強化


