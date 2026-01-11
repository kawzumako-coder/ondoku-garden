(() => {
  const STORAGE_KEY = "ondoku_garden_v4_complete";
  const STAMPS_TO_BLOOM = 8; // ★8回で開花

  // 8段階（0..7）
  const STAGES_COUNT = 9;
  const STAGE_LABELS = [
    "はなのたね","つちに　うめたよ","はっぱが　でてきた","すこし　せいちょうした",
    "はっぱが ふえた","ぐんぐん のびる","つぼみが　できた","つぼみが　おおきくなった！","さいた！！"
  ];
  const STAGE_HINTS = [
  ];

  function stagePath(id, idx){
  // 0〜7は共通の成長画像
  if(idx < 8){
    return `images/common/grow_${idx}.png`;
  }
  // 8（開花）は花ごとの画像
  return `images/bloom/${id}.png`;
} 


  const PLANTS = [
    { id:"sunflower", name:"ひまわり", emoji:"🌻",
      dex:{ desc:"ひまわりは おひさま みたいに おおきく さくよ。", fact:"おひさまの ほうを むいて そだつことがあるよ。" } },
    { id:"rose", name:"バラ", emoji:"🌹",
      dex:{ desc:"バラは いいにおいがする はな だよ。", fact:"トゲが ある しゅるいも あるよ。" } },
    { id:"tulip", name:"チューリップ", emoji:"🌷",
      dex:{ desc:"チューリップは いろが いろいろで かわいいよ。", fact:"はなが ひらくと おわんみたいに みえるよ。" } },
    { id:"sakura", name:"さくら", emoji:"🌸",
      dex:{ desc:"さくらは はるに さく 日本で だいにんきの はな。", fact:"きに たくさん いっせいに さくよ。" } },
    { id:"dandelion", name:"たんぽぽ", emoji:"🌼",
      dex:{ desc:"たんぽぽは みぢかな はな。のちに わたげにも なるよ。", fact:"わたげは かぜで とんで ふえるよ。" } },
    { id:"morningglory", name:"あさがお", emoji:"🌺",
      dex:{ desc:"あさがおは つるが のびて からみつく はな。", fact:"あさに さきやすいよ。" } },
    { id:"violet", name:"すみれ", emoji:"💜",
      dex:{ desc:"すみれは ちいさくて かわいい はな。", fact:"むらさき いろが おおいよ。" } },
    { id:"lily", name:"ゆり", emoji:"🤍",
      dex:{ desc:"ゆりは はなが おおきくて りっぱ。", fact:"いいにおいの しゅるいも あるよ。" } },
    { id:"hydrangea", name:"あじさい", emoji:"🟦",
      dex:{ desc:"あじさいは ちいさな はなが あつまって みえるよ。", fact:"いろが かわる ことも あるよ。" } },
    { id:"cosmos", name:"こすもす", emoji:"🌸",
      dex:{ desc:"こすもすは すらっとした くきに かるい はなが さくよ。", fact:"かぜに ゆれて きれいだよ。" } },
  ];

  // ===== Sound Effects =====
  const SFX = {
    pop: new Audio("sounds/pop.mp3"),
    bloom: new Audio("sounds/bloom.mp3"),
    next: new Audio("sounds/next.mp3"),
  };
  SFX.pop.volume = 0.5;
  SFX.bloom.volume = 0.6;
  SFX.next.volume = 0.5;

  function playSfx(key){
    const a = SFX[key];
    if(!a) return;
    try{
      a.currentTime = 0;
      a.play().catch(()=>{});
    }catch(e){}
  }

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const statusPill = $("statusPill");
  const artBox = $("artBox");
  const stageName = $("stageName");
  const hint = $("hint");
  const stampGrid = $("stampGrid");
  const dexGrid = $("dexGrid");
  const toast = $("toast");
  const stageMeter = $("stageMeter");
  const dexMeter = $("dexMeter");

  const mainBtn = $("mainBtn");
  const undoBtn = $("undoBtn");
  const resetBtn = $("resetBtn");
  const fullResetBtn = $("fullResetBtn");

  const tabDex = $("tab-dex");
  const tabAbout = $("tab-about");

  // ===== State =====
  let state = loadState();

  function defaultState(){
    return {
      stamps: 0,
      plantIndex: pickRandomPlantIndex([]),
      dex: [],
      version: 4
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const dex = Array.isArray(parsed.dex) ? parsed.dex : [];
      return {
        stamps: Number.isFinite(parsed.stamps) ? parsed.stamps : 0,
        plantIndex: Number.isFinite(parsed.plantIndex) ? parsed.plantIndex : pickRandomPlantIndex(dex),
        dex,
        version: 4
      };
    }catch(e){
      return defaultState();
    }
  }

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add("on");
    setTimeout(() => toast.classList.remove("on"), 1200);
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // ===== Random (uncollected only) =====
  function collectedIds(dex){ return dex.map(d => d.id); }
  function getUncollectedPlants(dex){
    const ids = collectedIds(dex);
    return PLANTS.filter(p => !ids.includes(p.id));
  }
  function pickRandomPlantIndex(dex){
    const remaining = getUncollectedPlants(dex);
    if(remaining.length === 0) return 0;
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    return PLANTS.findIndex(p => p.id === next.id);
  }
  function currentPlant(){ return PLANTS[state.plantIndex]; }

  // ===== Stage mapping =====
  function stageIndexFromStamps(stamps){
  // stamps: 0..8 を stage: 0..8 にそのまま対応させる
  return Math.max(0, Math.min(STAGES_COUNT - 1, stamps));
}

  // ===== Art loading =====
  function setArtImage(src, fallbackEmoji){
    artBox.innerHTML = "";
    const img = new Image();
    img.alt = "";
    img.src = src;
    img.onload = () => { artBox.innerHTML = ""; artBox.appendChild(img); };
    img.onerror = () => {
      const d = document.createElement("div");
      d.className = "fallbackEmoji";
      d.textContent = fallbackEmoji;
      artBox.innerHTML = "";
      artBox.appendChild(d);
    };
  }

  // ===== Render =====
  function renderStamps(){
    stampGrid.innerHTML = "";
    const filled = Math.min(state.stamps, STAMPS_TO_BLOOM);
    for(let i=1;i<=STAMPS_TO_BLOOM;i++){
      const d = document.createElement("div");
      d.className = "stamp" + (i<=filled ? " filled" : "");
      d.textContent = i<=filled ? "⭐" : "▫️";
      stampGrid.appendChild(d);
    }
  }

  function renderDexMeter(){
    dexMeter.textContent = `${state.dex.length} / ${PLANTS.length}`;
  }

  function renderPlant(){
    const plant = currentPlant();
    const sidx = stageIndexFromStamps(state.stamps);

    statusPill.textContent = `スタンプ: ${Math.min(state.stamps, STAMPS_TO_BLOOM)} / ${STAMPS_TO_BLOOM}`;
    stageMeter.textContent = `ステージ ${sidx + 1} / ${STAGES_COUNT}`;

    if(sidx === STAGES_COUNT - 1){
      stageName.textContent = `🌸 ${plant.name} が さいた！`;
      hint.textContent = "ずかんに とうろく されたよ。つぎのタネへ！";
    }else{
      stageName.textContent = STAGE_LABELS[sidx];
      hint.textContent = STAGE_HINTS[sidx];
    }

    const imgPath = stagePath(plant.id, sidx);
    const fallback = (sidx === STAGES_COUNT - 1) ? plant.emoji : "🌰";
    setArtImage(imgPath, fallback);

    undoBtn.disabled = state.stamps <= 0;

    if(state.stamps >= STAMPS_TO_BLOOM){
      const remaining = getUncollectedPlants(state.dex);
      mainBtn.textContent = (remaining.length > 0) ? "🌱 つぎのタネを そだてる" : "🎉 ずかんコンプリート！";
    }else{
      mainBtn.textContent = "🎤 おんどくしたよ！";
    }
  }

  function renderDex(){
    dexGrid.innerHTML = "";
    if(state.dex.length === 0){
      const empty = document.createElement("div");
      empty.className = "dexItem";
      empty.innerHTML = `<h3>まだ 0 こ</h3><div class="desc">花がさいたら、ここに ずかんが ふえるよ。</div>`;
      dexGrid.appendChild(empty);
      return;
    }
    state.dex.forEach(entry => {
      const item = document.createElement("div");
      item.className = "dexItem";
      item.innerHTML = `
        <h3>${entry.emoji} ${escapeHtml(entry.name)}<span class="badge">GET!</span></h3>
        <div class="desc">${escapeHtml(entry.desc)}</div>
        <div class="desc" style="margin-top:6px; color:#6b7280;">🔎 まめちしき：${escapeHtml(entry.fact)}</div>
      `;
      dexGrid.appendChild(item);
    });
  }

  function addDexIfNeeded(){
    const plant = currentPlant();
    const already = state.dex.some(x => x.id === plant.id);
    if(!already){
      state.dex.unshift({
        id: plant.id,
        name: plant.name,
        emoji: plant.emoji,
        desc: plant.dex.desc,
        fact: plant.dex.fact
      });
      showToast(`📘 ずかんに ${plant.name} が とうろく された！`);
    }
  }

  // ===== Tabs =====
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  function activateTab(which){
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === which));
    tabDex.classList.toggle("hide", which !== "dex");
    tabAbout.classList.toggle("hide", which !== "about");
  }

  // ===== Events =====
  mainBtn.addEventListener("click", () => {
    // 育成中：スタンプ増加
    if(state.stamps < STAMPS_TO_BLOOM){
      state.stamps += 1;
      playSfx("pop");
      save();
      renderStamps();
      renderPlant();
      showToast("ポン！スタンプ +1 ⭐");

      if(state.stamps === STAMPS_TO_BLOOM){
        playSfx("bloom");
        addDexIfNeeded();
        save();
        renderDex();
        renderDexMeter();
        activateTab("dex");
        showToast(`🌸 ${currentPlant().name} が さいた！`);
      }
      return;
    }

    // 次のタネ（未取得からランダム）
    const remaining = getUncollectedPlants(state.dex);
    if(remaining.length === 0){
      showToast("ずかんコンプリート！🎉");
      return;
    }

    playSfx("next");
    state.plantIndex = pickRandomPlantIndex(state.dex);
    state.stamps = 0;
    save();
    renderStamps();
    renderPlant();
    showToast("あたらしい タネだよ！");
  });

  undoBtn.addEventListener("click", () => {
    if(state.stamps <= 0) return;
    state.stamps -= 1;
    save();
    renderStamps();
    renderPlant();
    showToast("1つ もどしたよ");
  });

  resetBtn.addEventListener("click", () => {
    const ok = confirm("スタンプを 0 にもどすよ。ずかんは残すよ。OK？");
    if(!ok) return;
    state.stamps = 0;
    save();
    renderStamps();
    renderPlant();
    showToast("はじめから！🌱");
  });

  fullResetBtn.addEventListener("click", () => {
    const ok = confirm(
      "ぜんぶ さいしょから に もどるよ。\n" +
      "・スタンプ\n" +
      "・いまの はな\n" +
      "・ずかん\n\n" +
      "ぜんぶ けして いい？"
    );
    if(!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    save();

    renderStamps();
    renderPlant();
    renderDex();
    renderDexMeter();
    activateTab("dex");

    showToast("🌱 ぜんぶ さいしょから はじめよう！");
  });

  // ===== Init =====
  renderStamps();
  renderPlant();
  renderDex();
  renderDexMeter();
  activateTab("dex");
})();
