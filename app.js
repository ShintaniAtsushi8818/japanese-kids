const SETTINGS_KEY = "japaneseKidsSettings";

const TIMER_END_KEY = "japaneseKidsTimerEndAt";
const TIMER_LOCK_KEY = "japaneseKidsTimerLocked";

let settings = {
  pin: "",
  apiKey: "",
  strictJapanese: true,
  allowedChannels: []
};

let videos = [];
let currentIndex = 0;

let ytPlayer = null;
let playerReady = false;

let timerInterval = null;


/* ================================
   DOM
================================ */

const setupView =
  document.getElementById("setupView");

const homeView =
  document.getElementById("homeView");

const watchView =
  document.getElementById("watchView");

const pinView =
  document.getElementById("pinView");

const adminView =
  document.getElementById("adminView");

const message =
  document.getElementById("message");

const videoGrid =
  document.getElementById("videoGrid");


/* ================================
   設定
================================ */

function loadSettings() {

  const saved =
    localStorage.getItem(SETTINGS_KEY);

  if (saved) {

    try {

      settings = {
        ...settings,
        ...JSON.parse(saved)
      };

    } catch (e) {

      console.error(
        "設定の読み込みに失敗しました。",
        e
      );
    }
  }

  const strictJapanese =
    document.getElementById(
      "strictJapanese"
    );

  const adminApiKey =
    document.getElementById(
      "adminApiKey"
    );

  const adminPin =
    document.getElementById(
      "adminPin"
    );

  if (strictJapanese) {
    strictJapanese.checked =
      settings.strictJapanese;
  }

  if (adminApiKey) {
    adminApiKey.value =
      settings.apiKey || "";
  }

  if (adminPin) {
    adminPin.value =
      settings.pin || "";
  }
}


function saveSettings() {

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}


/* ================================
   画面切替
================================ */

function showOnly(view) {

  [
    setupView,
    homeView,
    watchView,
    pinView,
    adminView
  ].forEach(v => {

    if (v) {
      v.classList.add("hidden");
    }

  });

  if (view) {
    view.classList.remove("hidden");
  }
}


/* ================================
   アプリ初期化
================================ */

function initializeApp() {

  loadSettings();

  if (
    !settings.pin ||
    !settings.apiKey
  ) {

    showOnly(setupView);

  } else {

    showOnly(homeView);
  }

  renderAllowedChannels();
}


/* ================================
   タイマー初期化
================================ */

function initializeTimer() {

  const select =
    document.getElementById(
      "timerMinutes"
    );

  if (select) {

    select.innerHTML = "";

    for (
      let i = 1;
      i <= 60;
      i++
    ) {

      const option =
        document.createElement(
          "option"
        );

      option.value = i;

      option.textContent =
        `${i}分`;

      if (i === 30) {
        option.selected = true;
      }

      select.appendChild(option);
    }
  }


  const startTimer =
    document.getElementById(
      "startTimer"
    );

  if (startTimer) {

    startTimer.addEventListener(
      "click",
      startViewingTimer
    );
  }


  const cancelTimer =
    document.getElementById(
      "cancelTimer"
    );

  if (cancelTimer) {

    cancelTimer.addEventListener(
      "click",
      cancelViewingTimer
    );
  }


  const timeUpParentButton =
    document.getElementById(
      "timeUpParentButton"
    );

  if (timeUpParentButton) {

    timeUpParentButton.addEventListener(
      "click",
      parentUnlockFromTimeUp
    );
  }


  checkViewingTimer();


  if (timerInterval) {

    clearInterval(
      timerInterval
    );
  }


  timerInterval =
    setInterval(
      checkViewingTimer,
      1000
    );
}


/* ================================
   タイマー開始
================================ */

function startViewingTimer() {

  const timerMinutes =
    document.getElementById(
      "timerMinutes"
    );

  if (!timerMinutes) {
    return;
  }

  const minutes =
    Number(
      timerMinutes.value
    );


  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 60
  ) {

    alert(
      "1分〜60分で設定してください。"
    );

    return;
  }


  const endTime =
    Date.now() +
    minutes * 60 * 1000;


  localStorage.setItem(
    TIMER_END_KEY,
    String(endTime)
  );


  localStorage.removeItem(
    TIMER_LOCK_KEY
  );


  hideTimeUpOverlay();


  checkViewingTimer();


  alert(
    `${minutes}分のタイマーを開始しました。`
  );
}


/* ================================
   タイマー解除
================================ */

function cancelViewingTimer() {

  localStorage.removeItem(
    TIMER_END_KEY
  );

  localStorage.removeItem(
    TIMER_LOCK_KEY
  );

  hideTimeUpOverlay();

  updateTimerStatus(
    "タイマーは設定されていません。"
  );
}


/* ================================
   タイマー確認
================================ */

function checkViewingTimer() {

  const locked =
    localStorage.getItem(
      TIMER_LOCK_KEY
    ) === "1";


  if (locked) {

    stopVideoSafely();

    showTimeUpOverlay();

    return;
  }


  const endTime =
    Number(
      localStorage.getItem(
        TIMER_END_KEY
      ) || 0
    );


  if (!endTime) {

    updateTimerStatus(
      "タイマーは設定されていません。"
    );

    return;
  }


  const remaining =
    endTime - Date.now();


  if (remaining <= 0) {

    timeUp();

    return;
  }


  const totalSeconds =
    Math.ceil(
      remaining / 1000
    );


  const minutes =
    Math.floor(
      totalSeconds / 60
    );


  const seconds =
    totalSeconds % 60;


  updateTimerStatus(
    `残り ${minutes}分 ${String(seconds).padStart(2, "0")}秒`
  );
}


/* ================================
   タイマー表示更新
================================ */

function updateTimerStatus(text) {

  const status =
    document.getElementById(
      "timerStatus"
    );

  if (status) {

    status.textContent =
      text;
  }
}


/* ================================
   時間切れ
================================ */

function timeUp() {

  localStorage.setItem(
    TIMER_LOCK_KEY,
    "1"
  );


  localStorage.removeItem(
    TIMER_END_KEY
  );


  stopVideoSafely();


  showTimeUpOverlay();
}


/* ================================
   動画停止
================================ */

function stopVideoSafely() {

  try {

    if (
      ytPlayer &&
      typeof ytPlayer.stopVideo ===
        "function"
    ) {

      ytPlayer.stopVideo();
    }

  } catch (e) {

    console.error(
      "動画停止エラー",
      e
    );
  }
}


/* ================================
   ロック判定
================================ */

function isTimeLocked() {

  return (
    localStorage.getItem(
      TIMER_LOCK_KEY
    ) === "1"
  );
}


/* ================================
   オーバーレイ
================================ */

function showTimeUpOverlay() {

  const overlay =
    document.getElementById(
      "timeUpOverlay"
    );

  if (overlay) {

    overlay.classList.remove(
      "hidden"
    );
  }
}


function hideTimeUpOverlay() {

  const overlay =
    document.getElementById(
      "timeUpOverlay"
    );

  if (overlay) {

    overlay.classList.add(
      "hidden"
    );
  }
}


/* ================================
   大人による時間切れ解除
================================ */

function parentUnlockFromTimeUp() {

  const pin =
    prompt(
      "おとな用PINを入力してください。"
    );


  if (pin === null) {
    return;
  }


  if (pin !== settings.pin) {

    alert(
      "PINが違います。"
    );

    return;
  }


  cancelViewingTimer();


  renderAllowedChannels();


  showOnly(adminView);
}


/* ================================
   日本語判定
================================ */

function isJapanese(text) {

  const s =
    (text || "")
      .normalize("NFKC");


  if (
    settings.strictJapanese
  ) {

    return (
      /[\u3040-\u30ff]/.test(s)
    );
  }


  return (
    /[\u3040-\u30ff\u4e00-\u9fff]/.test(
      s
    )
  );
}


/* ================================
   YouTube API
================================ */

async function api(
  path,
  params
) {

  if (!settings.apiKey) {

    throw new Error(
      "APIキーが設定されていません。"
    );
  }


  const url =
    new URL(
      "https://www.googleapis.com/youtube/v3/" +
      path
    );


  const finalParams = {

    ...params,

    key:
      settings.apiKey
  };


  Object.entries(
    finalParams
  ).forEach(
    ([key, value]) => {

      url.searchParams.set(
        key,
        value
      );
    }
  );


  const response =
    await fetch(
      url.toString()
    );


  const json =
    await response.json();


  if (!response.ok) {

    throw new Error(
      json?.error?.message ||
      "YouTube APIでエラーが発生しました。"
    );
  }


  return json;
}


/* ================================
   初回設定保存
================================ */

document
  .getElementById(
    "saveSetup"
  )
  ?.addEventListener(
    "click",
    () => {

      const pin =
        document
          .getElementById(
            "setupPin"
          )
          .value
          .trim();


      const apiKey =
        document
          .getElementById(
            "setupApiKey"
          )
          .value
          .trim();


      if (!pin) {

        alert(
          "おとな用PINを入力してください。"
        );

        return;
      }


      if (!apiKey) {

        alert(
          "YouTube APIキーを入力してください。"
        );

        return;
      }


      settings.pin =
        pin;

      settings.apiKey =
        apiKey;


      saveSettings();


      const adminPin =
        document.getElementById(
          "adminPin"
        );


      const adminApiKey =
        document.getElementById(
          "adminApiKey"
        );


      if (adminPin) {
        adminPin.value =
          pin;
      }


      if (adminApiKey) {
        adminApiKey.value =
          apiKey;
      }


      showOnly(
        homeView
      );
    }
  );


/* ================================
   親画面
================================ */

document
  .getElementById(
    "parentButton"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        isTimeLocked()
      ) {

        showTimeUpOverlay();

        return;
      }


      if (!settings.pin) {

        showOnly(
          setupView
        );

        return;
      }


      const pinInput =
        document.getElementById(
          "pinInput"
        );


      if (pinInput) {

        pinInput.value =
          "";
      }


      showOnly(
        pinView
      );
    }
  );


document
  .getElementById(
    "unlockButton"
  )
  ?.addEventListener(
    "click",
    () => {

      const pinInput =
        document.getElementById(
          "pinInput"
        );


      const pin =
        pinInput
          ? pinInput.value
          : "";


      if (
        pin !==
        settings.pin
      ) {

        alert(
          "PINが違います。"
        );

        return;
      }


      renderAllowedChannels();


      showOnly(
        adminView
      );
    }
  );


document
  .getElementById(
    "cancelPin"
  )
  ?.addEventListener(
    "click",
    () => {

      showOnly(
        homeView
      );
    }
  );


document
  .getElementById(
    "closeAdmin"
  )
  ?.addEventListener(
    "click",
    () => {

      showOnly(
        homeView
      );
    }
  );


/* ================================
   親設定保存
================================ */

document
  .getElementById(
    "saveAdminSettings"
  )
  ?.addEventListener(
    "click",
    () => {

      const newApiKey =
        document
          .getElementById(
            "adminApiKey"
          )
          .value
          .trim();


      const newPin =
        document
          .getElementById(
            "adminPin"
          )
          .value
          .trim();


      if (
        !newApiKey ||
        !newPin
      ) {

        alert(
          "APIキーとPINを入力してください。"
        );

        return;
      }


      settings.apiKey =
        newApiKey;


      settings.pin =
        newPin;


      const strictJapanese =
        document.getElementById(
          "strictJapanese"
        );


      if (
        strictJapanese
      ) {

        settings.strictJapanese =
          strictJapanese.checked;
      }


      saveSettings();


      alert(
        "設定を保存しました。"
      );
    }
  );


document
  .getElementById(
    "strictJapanese"
  )
  ?.addEventListener(
    "change",
    e => {

      settings.strictJapanese =
        e.target.checked;


      saveSettings();
    }
  );


/* ================================
   チャンネル検索
================================ */

document
  .getElementById(
    "searchChannel"
  )
  ?.addEventListener(
    "click",
    searchChannels
  );


async function searchChannels() {

  const searchInput =
    document.getElementById(
      "channelSearch"
    );


  const results =
    document.getElementById(
      "channelResults"
    );


  if (
    !searchInput ||
    !results
  ) {
    return;
  }


  const query =
    searchInput
      .value
      .trim();


  if (!query) {

    alert(
      "検索する文字を入力してください。"
    );

    return;
  }


  results.innerHTML =
    "検索中...";


  try {

    const json =
      await api(
        "search",
        {

          part:
            "snippet",

          type:
            "channel",

          q:
            query,

          maxResults:
            "10",

          regionCode:
            "JP",

          relevanceLanguage:
            "ja",

          safeSearch:
            "strict"
        }
      );


    results.innerHTML =
      "";


    if (
      !json.items?.length
    ) {

      results.textContent =
        "チャンネルが見つかりませんでした。";

      return;
    }


    json.items.forEach(
      item => {

        const channel = {

          id:
            item.id.channelId,

          title:
            item.snippet.title,

          thumbnail:
            item.snippet
              .thumbnails
              ?.default
              ?.url ||
            ""
        };


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "channel-item";


        row.innerHTML = `
          <img
            src="${channel.thumbnail}"
            alt=""
          >

          <div class="channel-text">

            <h4>
              ${escapeHtml(channel.title)}
            </h4>

            <p>
              ${escapeHtml(channel.id)}
            </p>

          </div>
        `;


        const button =
          document.createElement(
            "button"
          );


        button.textContent =
          "追加";


        button.addEventListener(
          "click",
          () => {

            addAllowedChannel(
              channel
            );
          }
        );


        row.appendChild(
          button
        );


        results.appendChild(
          row
        );
      }
    );

  } catch (e) {

    results.textContent =
      e.message;
  }
}


/* ================================
   チャンネル追加
================================ */

function addAllowedChannel(
  channel
) {

  const exists =
    settings
      .allowedChannels
      .some(
        c =>
          c.id ===
          channel.id
      );


  if (exists) {

    alert(
      "すでに追加されています。"
    );

    return;
  }


  settings
    .allowedChannels
    .push(
      channel
    );


  saveSettings();


  renderAllowedChannels();


  alert(
    "チャンネルを追加しました。"
  );
}


/* ================================
   チャンネル削除
================================ */

function removeAllowedChannel(
  id
) {

  settings.allowedChannels =
    settings
      .allowedChannels
      .filter(
        c =>
          c.id !==
          id
      );


  saveSettings();


  renderAllowedChannels();
}


/* ================================
   許可チャンネル表示
================================ */

function renderAllowedChannels() {

  const container =
    document.getElementById(
      "allowedChannels"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    !settings
      .allowedChannels
      .length
  ) {

    container.textContent =
      "まだチャンネルが登録されていません。";

    return;
  }


  settings
    .allowedChannels
    .forEach(
      channel => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "channel-item";


        row.innerHTML = `
          <img
            src="${channel.thumbnail || ""}"
            alt=""
          >

          <div class="channel-text">

            <h4>
              ${escapeHtml(channel.title)}
            </h4>

            <p>
              ${escapeHtml(channel.id)}
            </p>

          </div>
        `;


        const button =
          document.createElement(
            "button"
          );


        button.textContent =
          "削除";


        button.addEventListener(
          "click",
          () => {

            const ok =
              confirm(
                `${channel.title} を削除しますか？`
              );


            if (ok) {

              removeAllowedChannel(
                channel.id
              );
            }
          }
        );


        row.appendChild(
          button
        );


        container.appendChild(
          row
        );
      }
    );
}


/* ================================
   動画読込
================================ */

document
  .getElementById(
    "refreshVideos"
  )
  ?.addEventListener(
    "click",
    loadVideos
  );


async function loadVideos() {

  if (
    isTimeLocked()
  ) {

    showTimeUpOverlay();

    return;
  }


  if (
    !settings
      .allowedChannels
      .length
  ) {

    if (message) {

      message.textContent =
        "おとな用設定からチャンネルを追加してください。";
    }

    return;
  }


  if (message) {

    message.textContent =
      "日本語の動画を探しています...";
  }


  if (videoGrid) {

    videoGrid.innerHTML =
      "";
  }


  videos = [];


  try {

    for (
      const channel
      of
      settings.allowedChannels
    ) {

      const json =
        await api(
          "search",
          {

            part:
              "snippet",

            type:
              "video",

            channelId:
              channel.id,

            order:
              "date",

            maxResults:
              "20",

            regionCode:
              "JP",

            relevanceLanguage:
              "ja",

            safeSearch:
              "strict",

            videoEmbeddable:
              "true"
          }
        );


      const channelVideos =
        (json.items || [])

          .filter(
            item =>
              isJapanese(
                item.snippet.title
              )
          )

          .map(
            item => ({

              id:
                item.id.videoId,

              title:
                item.snippet.title,

              channelTitle:
                item.snippet.channelTitle,

              thumbnail:
                item.snippet
                  .thumbnails
                  ?.medium
                  ?.url ||

                item.snippet
                  .thumbnails
                  ?.default
                  ?.url ||

                ""
            })
          );


      videos.push(
        ...channelVideos
      );
    }


    const unique =
      new Map();


    videos.forEach(
      video => {

        unique.set(
          video.id,
          video
        );
      }
    );


    videos =
      Array.from(
        unique.values()
      );


    sessionStorage.setItem(
      "japaneseKidsVideos",
      JSON.stringify(videos)
    );


    renderVideos();


    if (message) {

      message.textContent =
        videos.length
          ? `${videos.length}本の動画が見つかりました。`
          : "条件に合う動画がありませんでした。";
    }

  } catch (e) {

    if (message) {

      message.textContent =
        e.message;
    }
  }
}


/* ================================
   動画一覧表示
================================ */

function renderVideos() {

  if (!videoGrid) {
    return;
  }


  videoGrid.innerHTML =
    "";


  videos.forEach(
    (video, index) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "video-card";


      card.innerHTML = `
        <img
          src="${video.thumbnail}"
          alt=""
          loading="lazy"
        >

        <div class="video-info">

          <h3>
            ${escapeHtml(video.title)}
          </h3>

          <p>
            ${escapeHtml(video.channelTitle)}
          </p>

        </div>
      `;


      card.addEventListener(
        "click",
        () => {

          playVideo(
            index
          );
        }
      );


      videoGrid.appendChild(
        card
      );
    }
  );
}


/* ================================
   シャッフル
================================ */

document
  .getElementById(
    "shuffleVideos"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        isTimeLocked()
      ) {

        showTimeUpOverlay();

        return;
      }


      for (
        let i =
          videos.length - 1;

        i > 0;

        i--
      ) {

        const j =
          Math.floor(
            Math.random() *
            (i + 1)
          );


        [
          videos[i],
          videos[j]
        ] = [
          videos[j],
          videos[i]
        ];
      }


      renderVideos();
    }
  );


/* ================================
   動画再生
================================ */

function playVideo(index) {

  if (
    isTimeLocked()
  ) {

    stopVideoSafely();

    showTimeUpOverlay();

    return;
  }


  if (
    !videos.length
  ) {
    return;
  }


  if (
    index < 0 ||
    index >=
      videos.length
  ) {
    return;
  }


  currentIndex =
    index;


  const video =
    videos[
      currentIndex
    ];


  const playingTitle =
    document.getElementById(
      "playingTitle"
    );


  if (playingTitle) {

    playingTitle.textContent =
      video.title;
  }


  showOnly(
    watchView
  );


  if (
    ytPlayer &&
    playerReady
  ) {

    ytPlayer.loadVideoById(
      video.id
    );

  } else if (
    window.YT &&
    window.YT.Player
  ) {

    createPlayer(
      video.id
    );
  }
}


/* ================================
   YouTube Player
================================ */

function createPlayer(videoId) {

  ytPlayer =
    new YT.Player(
      "player",
      {

        videoId,

        playerVars: {

          autoplay:
            1,

          playsinline:
            1,

          rel:
            0,

          modestbranding:
            1,

          fs:
            1
        },


        events: {

          onReady:
            event => {

              playerReady =
                true;


              if (
                isTimeLocked()
              ) {

                event.target
                  .stopVideo();


                showTimeUpOverlay();


                return;
              }


              event.target
                .playVideo();
            },


          onStateChange:
            event => {

              if (
                isTimeLocked() &&
                event.data ===
                  YT.PlayerState
                    .PLAYING
              ) {

                event.target
                  .stopVideo();


                showTimeUpOverlay();


                return;
              }


              if (
                event.data ===
                  YT.PlayerState
                    .ENDED
              ) {

                nextVideo();
              }
            }
        }
      }
    );
}


/* ================================
   IFrame API 初期化
================================ */

window.onYouTubeIframeAPIReady =
  function () {

    console.log(
      "YouTube IFrame API Ready"
    );
  };


/* ================================
   次の動画
================================ */

function nextVideo() {

  if (
    isTimeLocked()
  ) {

    stopVideoSafely();

    showTimeUpOverlay();

    return;
  }


  if (
    !videos.length
  ) {
    return;
  }


  currentIndex++;


  if (
    currentIndex >=
    videos.length
  ) {

    currentIndex =
      0;
  }


  const video =
    videos[
      currentIndex
    ];


  const playingTitle =
    document.getElementById(
      "playingTitle"
    );


  if (playingTitle) {

    playingTitle.textContent =
      video.title;
  }


  if (
    ytPlayer &&
    typeof
      ytPlayer.loadVideoById ===
      "function"
  ) {

    ytPlayer.loadVideoById(
      video.id
    );
  }
}


/* ================================
   前の動画
================================ */

function previousVideo() {

  if (
    isTimeLocked()
  ) {

    stopVideoSafely();

    showTimeUpOverlay();

    return;
  }


  if (
    !videos.length
  ) {
    return;
  }


  currentIndex--;


  if (
    currentIndex < 0
  ) {

    currentIndex =
      videos.length - 1;
  }


  const video =
    videos[
      currentIndex
    ];


  const playingTitle =
    document.getElementById(
      "playingTitle"
    );


  if (playingTitle) {

    playingTitle.textContent =
      video.title;
  }


  if (
    ytPlayer &&
    typeof
      ytPlayer.loadVideoById ===
      "function"
  ) {

    ytPlayer.loadVideoById(
      video.id
    );
  }
}


/* ================================
   再生ボタン
================================ */

document
  .getElementById(
    "nextVideo"
  )
  ?.addEventListener(
    "click",
    nextVideo
  );


document
  .getElementById(
    "previousVideo"
  )
  ?.addEventListener(
    "click",
    previousVideo
  );


document
  .getElementById(
    "backButton"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        isTimeLocked()
      ) {

        stopVideoSafely();

        showTimeUpOverlay();

        return;
      }


      try {

        if (
          ytPlayer &&
          typeof
            ytPlayer.pauseVideo ===
            "function"
        ) {

          ytPlayer.pauseVideo();
        }

      } catch (e) {

        console.error(e);
      }


      showOnly(
        homeView
      );
    }
  );


/* ================================
   HTMLエスケープ
================================ */

function escapeHtml(text) {

  return String(
    text || ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}


/* ================================
   保存済み動画
================================ */

const storedVideos =
  sessionStorage.getItem(
    "japaneseKidsVideos"
  );


if (storedVideos) {

  try {

    videos =
      JSON.parse(
        storedVideos
      );

  } catch (e) {

    videos = [];

    console.error(
      "動画データの読み込みに失敗しました。",
      e
    );
  }
}


/* ================================
   起動
================================ */

initializeApp();

initializeTimer();