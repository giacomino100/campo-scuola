(function () {
  const library = window.PDF_LIBRARY || { documents: [] };
  const documents = library.documents || [];
  const state = {
    currentIndex: 0,
    page: 1,
    query: ""
  };

  const nodes = {
    librarySummary: document.getElementById("librarySummary"),
    searchInput: document.getElementById("searchInput"),
    searchStatus: document.getElementById("searchStatus"),
    docList: document.getElementById("docList"),
    docTitle: document.getElementById("docTitle"),
    docMeta: document.getElementById("docMeta"),
    pdfFrame: document.getElementById("pdfFrame"),
    prevDocButton: document.getElementById("prevDocButton"),
    nextDocButton: document.getElementById("nextDocButton"),
    prevPageButton: document.getElementById("prevPageButton"),
    nextPageButton: document.getElementById("nextPageButton"),
    pageInput: document.getElementById("pageInput"),
    pageTotal: document.getElementById("pageTotal"),
    openButton: document.getElementById("openButton"),
    mobileOpenButton: document.getElementById("mobileOpenButton"),
    detailsPanel: document.getElementById("detailsPanel"),
    detailPages: document.getElementById("detailPages"),
    detailSearch: document.getElementById("detailSearch"),
    detailSize: document.getElementById("detailSize"),
    detailFile: document.getElementById("detailFile")
  };

  function encodePdfPath(file) {
    return file.split("/").map(encodeURIComponent).join("/");
  }

  function pdfUrl(doc, page) {
    return `${encodePdfPath(doc.file)}#page=${page}&zoom=page-fit`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function searchLabel(doc) {
    if (doc.textPages === 0) return "PDF immagine";
    if (doc.textPages === doc.pages) return "Testo ricercabile";
    return `${doc.textPages}/${doc.pages} pagine ricercabili`;
  }

  function searchClass(doc) {
    return doc.textPages > 0 ? "searchable" : "image";
  }

  function currentDoc() {
    return documents[state.currentIndex];
  }

  function isCompactScreen() {
    return window.matchMedia("(max-width: 560px)").matches;
  }

  function openPdfDirect(doc, page) {
    window.location.href = pdfUrl(doc, page || 1);
  }

  function clampPage(doc, page) {
    return Math.min(Math.max(Number(page) || 1, 1), doc.pages || 1);
  }

  function openDocument(index, page) {
    const doc = documents[index];
    if (!doc) return;

    state.currentIndex = index;
    state.page = clampPage(doc, page);

    nodes.docTitle.textContent = doc.title;
    nodes.docMeta.textContent = "PDF originale";
    nodes.pageInput.max = String(doc.pages || 1);
    nodes.pageInput.value = String(state.page);
    nodes.pageTotal.textContent = `/ ${doc.pages || 1}`;
    nodes.pdfFrame.src = pdfUrl(doc, state.page);
    nodes.openButton.href = pdfUrl(doc, state.page);
    nodes.mobileOpenButton.href = pdfUrl(doc, state.page);

    nodes.detailPages.textContent = String(doc.pages || "-");
    nodes.detailSearch.textContent = searchLabel(doc);
    nodes.detailSize.textContent = formatBytes(doc.size);
    nodes.detailFile.textContent = doc.file;

    nodes.prevDocButton.disabled = state.currentIndex === 0;
    nodes.nextDocButton.disabled = state.currentIndex === documents.length - 1;
    nodes.prevPageButton.disabled = state.page <= 1;
    nodes.nextPageButton.disabled = state.page >= doc.pages;

    renderList();
  }

  function createDocButton(doc, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `doc-item${index === state.currentIndex ? " active" : ""}`;
    button.innerHTML = `
      <span class="doc-title"></span>
      <span class="doc-subtitle">
        <span class="tag">${doc.pages} pagine</span>
        <span class="tag ${searchClass(doc)}">${searchLabel(doc)}</span>
      </span>
    `;
    button.querySelector(".doc-title").textContent = doc.title;
    button.querySelectorAll(".tag")[0].textContent = `${doc.pages} pagine`;
    button.querySelectorAll(".tag")[1].textContent = searchLabel(doc);
    button.addEventListener("click", () => {
      if (isCompactScreen()) {
        openPdfDirect(doc, 1);
        return;
      }
      openDocument(index, 1);
    });
    return button;
  }

  function createResultButton(result) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.innerHTML = `
      <span class="result-title"></span>
      <span class="result-subtitle">
        <span class="tag"></span>
        <span class="tag searchable"></span>
      </span>
    `;
    button.querySelector(".result-title").textContent = result.doc.title;
    button.querySelectorAll(".tag")[0].textContent = `Pagina ${result.page}`;
    button.querySelectorAll(".tag")[1].textContent = result.reason;
    button.addEventListener("click", () => {
      if (isCompactScreen()) {
        openPdfDirect(result.doc, result.page);
        return;
      }
      openDocument(result.index, result.page);
    });
    return button;
  }

  function searchDocuments(query) {
    const needle = query.trim().toLocaleLowerCase("it");
    if (!needle) return [];

    const results = [];
    documents.forEach((doc, index) => {
      const titleHit = doc.title.toLocaleLowerCase("it").includes(needle) ||
        doc.file.toLocaleLowerCase("it").includes(needle);

      if (titleHit) {
        results.push({ doc, index, page: 1, reason: "Titolo" });
      }

      (doc.searchPages || []).forEach((entry) => {
        if (entry.text.toLocaleLowerCase("it").includes(needle)) {
          results.push({ doc, index, page: entry.page, reason: "Testo" });
        }
      });
    });

    return results;
  }

  function renderList() {
    const query = state.query.trim();
    nodes.docList.innerHTML = "";

    if (!query) {
      nodes.searchStatus.textContent = `${documents.length} documenti`;
      documents.forEach((doc, index) => {
        nodes.docList.appendChild(createDocButton(doc, index));
      });
      return;
    }

    const results = searchDocuments(query);
    nodes.searchStatus.textContent = `${results.length} risultati`;

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-status";
      empty.textContent = "Nessun risultato";
      nodes.docList.appendChild(empty);
      return;
    }

    results.slice(0, 120).forEach((result) => {
      nodes.docList.appendChild(createResultButton(result));
    });
  }

  function bindEvents() {
    const compactMedia = window.matchMedia("(max-width: 560px)");

    function syncSummary() {
      nodes.librarySummary.textContent = compactMedia.matches
        ? `${documents.length} documenti - tocca per aprire`
        : `${documents.length} documenti PDF`;
    }

    function syncDetailsPanel() {
      nodes.detailsPanel.open = !compactMedia.matches;
    }

    syncSummary();
    syncDetailsPanel();
    compactMedia.addEventListener("change", () => {
      syncSummary();
      syncDetailsPanel();
    });

    nodes.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderList();
    });

    nodes.prevDocButton.addEventListener("click", () => {
      openDocument(state.currentIndex - 1, 1);
    });

    nodes.nextDocButton.addEventListener("click", () => {
      openDocument(state.currentIndex + 1, 1);
    });

    nodes.prevPageButton.addEventListener("click", () => {
      openDocument(state.currentIndex, state.page - 1);
    });

    nodes.nextPageButton.addEventListener("click", () => {
      openDocument(state.currentIndex, state.page + 1);
    });

    nodes.pageInput.addEventListener("change", (event) => {
      openDocument(state.currentIndex, event.target.value);
    });
  }

  function init() {
    bindEvents();
    openDocument(0, 1);
  }

  init();
}());
