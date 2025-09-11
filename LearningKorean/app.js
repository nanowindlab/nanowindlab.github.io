let allWordData = []; // 모든 단어 데이터를 저장하는 마스터 배열
let wordData = []; // 현재 필터링된 단어 데이터를 저장하는 배열
let currentCategory = 'All'; // 현재 선택된 카테고리
let currentCardIndex = 0; // 모바일용 현재 카드 인덱스

const CARDS_PER_PAGE = 9;
let currentPage = 1;
let totalPages = 0;

// --- DOM Elements ---
const cardContainer = document.getElementById('card-container');
const pageInfo = document.getElementById('page-info');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const categoryFilterContainer = document.getElementById('category-filter-container');
const mobileNav = document.getElementById('mobile-nav');
const prevCardButton = document.getElementById('prev-card');
const nextCardButton = document.getElementById('next-card');
const cardIndicator = document.getElementById('card-indicator');

// --- DATA PROCESSING ---

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      const value = values[index] ? values[index].trim() : '';
      obj[header] = value === 'null' ? null : value;
    });
    return obj;
  });
}

function generateAssetUrls(k_word, e_word) {
  if (!k_word || !e_word) return { image_url: '', k_audio_url: '', k_sentence_audio_url: '', e_audio_url: '' };
  const baseUrl = CONFIG.ASSETS_BASE_URL;
  const filename = `${encodeURIComponent(k_word)}_${encodeURIComponent(e_word)}`;
  return {
    image_url: `${baseUrl}/Assets/word_images/${filename}.png`,
    k_audio_url: `${baseUrl}/Assets/word_audio/${filename}.mp3`,
    k_sentence_audio_url: `${baseUrl}/Assets/word_audio/${filename}_예문.mp3`,
    e_audio_url: `${baseUrl}/Assets/word_audio/${e_word}_${k_word}.mp3`
  };
}

async function loadWordData() {
  const csvUrl = CONFIG.USE_LOCAL ? CONFIG.LOCAL_CSV_PATH : CONFIG.GOOGLE_SHEETS_URL;
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();
    allWordData = parseCSV(csvText);
    console.log(`Loaded ${allWordData.length} words from ${csvUrl}`);

    // URL 파라미터에서 특정 카테고리 값을 확인 (앞뒤 공백 제거로 안정성 높임)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category')?.trim(); // URL 파라미터의 공백 제거
    const validCategories = [...new Set(allWordData.map(item => item.category?.trim()).filter(Boolean))]; // 데이터의 카테고리 공백 제거

    // --- DEBUGGING START ---
    console.log("DEBUG: Category from URL parameter is:", `'${categoryFromUrl}'`);
    console.log("DEBUG: Available categories from data are:", validCategories);
    if (categoryFromUrl) {
      console.log(`DEBUG: Is '${categoryFromUrl}' in the list? ->`, validCategories.includes(categoryFromUrl));
    }
    // --- DEBUGGING END ---

    if (categoryFromUrl && validCategories.includes(categoryFromUrl)) {
      currentCategory = categoryFromUrl;
    }

    setupCategories();
    filterAndRender();
  } catch (error) {
    console.error('Data loading failed:', error);
    cardContainer.innerHTML = '<div style="color: white; text-align: center; padding: 50px;">단어 데이터를 불러오는데 실패했습니다. 네트워크 연결 또는 CSV 주소를 확인해주세요.</div>';
  }
}

// --- CATEGORY & FILTERING ---

function setupCategories() {
  const categories = ['All', ...new Set(allWordData.map(item => item.category).filter(Boolean))];
  renderCategoryFilters(categories);
}

function renderCategoryFilters(categories) {
  categoryFilterContainer.innerHTML = '';
  categories.forEach(category => {
    const button = document.createElement('button');
    button.className = 'category-button';
    button.textContent = category;
    button.dataset.category = category;
    if (category === currentCategory) button.classList.add('active');
    button.addEventListener('click', () => {
      currentCategory = category;
      currentPage = 1;
      currentCardIndex = 0;
      updateActiveButton();
      filterAndRender();
    });
    categoryFilterContainer.appendChild(button);
  });
}

function updateActiveButton() {
  document.querySelectorAll('.category-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === currentCategory);
  });
}

function filterAndRender() {
  wordData = (currentCategory === 'All') 
    ? [...allWordData] 
    : allWordData.filter(item => item.category === currentCategory);
  
  totalPages = Math.ceil(wordData.length / CARDS_PER_PAGE);
  renderPage();
}

// ---RENDERING & EVENTS ---

function createCardHTML(card, index) {
  const { k_word, e_word, k_sentence } = card;
  if (!k_word || !e_word || !k_sentence) {
    console.warn('Skipping card due to missing required data:', card);
    return '';
  }
  const assets = generateAssetUrls(k_word, e_word);
  return `
    <div class="card" role="region" aria-label="단어 플립카드 ${index + 1}">
      <div class="card-content">
        <section class="slot" id="slot-top-${index}">
          <div class="slot-inner">
            <section class="face front top flip-target" role="button" tabindex="0" aria-pressed="false" aria-label="상단 슬롯 뒤집기">
              <div class="image-wrap"><img src="${assets.image_url}" alt="${k_word} 이미지" onerror="this.style.display='none'"/></div>
            </section>
            <section class="face back top">
              <button class="audio-fab" type="button" aria-label="예문 오디오 재생" data-audio-src="${assets.k_sentence_audio_url}" style="display: ${assets.k_sentence_audio_url ? 'inline-flex' : 'none'};"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
              <p class="example">${k_sentence.replace(/,/g, '\n')}</p>
            </section>
          </div>
        </section>
        <section class="slot" id="slot-bottom-${index}">
          <div class="slot-inner">
            <section class="face front bottom flip-target" role="button" tabindex="0" aria-pressed="false" aria-label="하단 슬롯 뒤집기">
              <button class="audio-fab" type="button" aria-label="한국어 단어 오디오 재생" data-audio-src="${assets.k_audio_url}" style="display: ${assets.k_audio_url ? 'inline-flex' : 'none'};"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
              <div class="word">${k_word.replace(/,/g, '\n')}</div>
            </section>
            <section class="face back bottom">
              <button class="audio-fab" type="button" aria-label="영어 단어 오디오 재생" data-audio-src="${assets.e_audio_url}" style="display: ${assets.e_audio_url ? 'inline-flex' : 'none'};"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
              <div class="meaning">${e_word.replace(/,/g, '\n')}</div>
            </section>
          </div>
        </section>
      </div>
    </div>
  `;
}

function playAudio(src) {
  if (!src) return;
  const a = new Audio(src);
  a.play().catch(() => console.warn('Audio playback failed:', src));
}

function attachFlip(slotId) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const front = slot.querySelector('.front.flip-target');
  const toggle = () => slot.classList.toggle('flipped');
  slot.addEventListener('click', (e) => {
    if (e.target.closest('[data-audio-src]')) return;
    toggle();
  });
  front.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
}

function renderPage() {
  cardContainer.innerHTML = '';
  const isMobile = window.innerWidth <= 768;

  if (wordData.length === 0) {
    cardContainer.innerHTML = '<div style="color: white; text-align: center; padding: 50px;">이 카테고리에는 단어가 없습니다.</div>';
    pageInfo.textContent = '페이지 0 / 0';
    prevButton.disabled = true;
    nextButton.disabled = true;
    cardIndicator.textContent = '0 / 0';
    prevCardButton.disabled = true;
    nextCardButton.disabled = true;
    return;
  }

  if (isMobile) {
    const card = wordData[currentCardIndex];
    if (card) {
      const cardHTML = createCardHTML(card, currentCardIndex);
      cardContainer.innerHTML = cardHTML;
      attachFlip(`slot-top-${currentCardIndex}`);
      attachFlip(`slot-bottom-${currentCardIndex}`);
    }
    cardIndicator.textContent = `${currentCardIndex + 1} / ${wordData.length}`;
    prevCardButton.disabled = currentCardIndex === 0;
    nextCardButton.disabled = currentCardIndex >= wordData.length - 1;
  } else {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    const end = start + CARDS_PER_PAGE;
    const pageData = wordData.slice(start, end);
    const fragment = document.createDocumentFragment();
    pageData.forEach((card, i) => {
      const cardIndex = start + i;
      const cardHTML = createCardHTML(card, cardIndex);
      if (cardHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        fragment.appendChild(tempDiv.firstElementChild);
      }
    });
    cardContainer.appendChild(fragment);
    pageData.forEach((card, i) => {
      const cardIndex = start + i;
      if (card.k_word && card.e_word && card.k_sentence) {
        attachFlip(`slot-top-${cardIndex}`);
        attachFlip(`slot-bottom-${cardIndex}`);
      }
    });
    pageInfo.textContent = `페이지 ${currentPage} / ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  }

  document.querySelectorAll('[data-audio-src]').forEach(el => {
    const src = el.getAttribute('data-audio-src');
    if (!src) return;
    el.addEventListener('click', (e) => { e.stopPropagation(); playAudio(src); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); playAudio(src); }
    });
  });
}

// --- EVENT LISTENERS ---

prevButton.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderPage(); }
});

nextButton.addEventListener('click', () => {
  if (currentPage < totalPages) { currentPage++; renderPage(); }
});

prevCardButton.addEventListener('click', () => {
  if (currentCardIndex > 0) { currentCardIndex--; renderPage(); }
});

nextCardButton.addEventListener('click', () => {
  if (currentCardIndex < wordData.length - 1) { currentCardIndex++; renderPage(); }
});

window.addEventListener('resize', renderPage); // 화면 크기 변경 시 레이아웃 재구성

// --- INITIALIZATION ---

loadWordData();
