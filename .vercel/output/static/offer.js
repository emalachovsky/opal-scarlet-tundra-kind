
  function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    html.setAttribute('data-theme', isLight ? 'dark' : 'light');
    v('themeIcon').textContent  = isLight ? '🌙' : '☀️';
  }

  // ─── PDF EXPORT: stručná správa pre klienta ───────────────────────────────
  // Z aktuálnych hodnôt poskladá jednu stranu A4 (základné údaje, stará/nová cena, dátumy, úspora
  // + krátke vysvetlenie nastavenia) a vytlačí ju; dashboard sa pri tlači skryje.
  function buildPdfReport() {
    const esc  = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const eur0 = n => ((Math.round(n) || 0)).toLocaleString('sk-SK') + '\u00a0€';
    const mwh  = n => num2(n) + '\u00a0€/MWh';
    const ICON = {
      el:  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a5fb4" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2.5 4.8 13.2h6.4L10 21.5l9.2-11.3h-6.4L13 2.5z"/></svg>',
      gas: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a86a00" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.8c.8 2.7 3.6 4.2 4.4 8.2a4.6 4.6 0 0 1-9 1.2c0-1.7.9-2.8 1.8-3.6.2 1.6 1.1 2.4 2 2.4.2-3.2-.6-5.2.8-8.2z"/></svg>'
    };

    const cats = ['el', 'gas'].filter(c => ENERGY_ON[c]);
    if (!cats.length) return null;

    const cards = cats.map(cat => {
      const C      = cat === 'el' ? 'El' : 'Gas';
      const mode   = FS_MODE[cat];
      const cons   = num('inp_cons' + C);
      const cur    = num('inp_cur' + C);
      const pred   = num('inp_' + cat + '2027'),  offer  = num('inp_' + cat + 'Max');
      const pred2  = num('inp_' + cat + '2028'),  offer2 = num('inp_' + cat + 'Fix2028');
      const years  = Math.max(1, Math.round(num('inp_years_' + cat)) || 2);
      const start  = parseDateInput('inp_start_' + cat, new Date(2027, 0, 1));
      const end    = contractEndFor(cat, start, years);
      const fixYear = start.getFullYear() + 1;
      const range  = dsk(start) + ' – ' + dsk(end);
      const supplier = (SUPPLIER[cat] || '').trim();
      const boundArr = String(BOUND_UNTIL[cat] || '').split(',').map(t => t.trim()).filter(Boolean);
      const bound  = boundArr.length ? boundArr[boundArr.length - 1] : '';

      // riadky tabuľky: obdobie | očakávaná cena | naša cena | úspora
      let rows;
      if (mode === 'KOMBI') {
        rows = [
          { lab: 'SPOT ' + start.getFullYear(), dates: dsk(start) + ' – ' + dsk(new Date(start.getFullYear(), 11, 31)), old: pred,  nw: offer },
          { lab: 'FIX ' + fixSpanText(fixYear, years), dates: dsk(new Date(fixYear, 0, 1)) + ' – ' + dsk(end), old: pred2, nw: offer2 }
        ];
      } else if (mode === 'SPOT') {
        rows = [{ lab: 'Cena SPOT', dates: range, old: pred, nw: offer }];
      } else {
        rows = [{ lab: 'Pevná cena FIX ' + fixSpanText(start.getFullYear(), years), dates: range, old: pred, nw: offer }];
      }
      rows.forEach(r => { r.unit = r.old - r.nw; r.year = cons * r.unit; });

      // krátka správa: ako je ponuka nastavená a prečo
      const s1 = cur > 0
        ? 'Dnes platíte <b>' + mwh(cur) + '</b>' + (supplier ? ' (' + esc(supplier) + ')' : '') + (bound ? ', zmluva končí <b>' + esc(bound) + '</b>' : '') + '. '
        : (bound ? 'Súčasná zmluva končí <b>' + esc(bound) + '</b>. ' : '');
      const est = bound ? 'Po jej skončení odhadujeme cenu približne na ' : 'Odhadujeme cenu približne na ';
      let s2;
      if (mode === 'KOMBI') {
        s2 = 'Navrhujeme kombináciu: v roku ' + start.getFullYear() + ' SPOT cenu <b>' + mwh(offer) + '</b> (odhad bez zmeny <b>' + mwh(pred) + '</b>) a potom pevnú FIX cenu <b>' + mwh(offer2) + '</b> (odhad <b>' + mwh(pred2) + '</b>) na ' + (years > 1 ? 'roky ' : 'rok ') + fixYear + (years > 1 ? '–' + (fixYear + years - 1) + ' (priemer)' : '') + '.';
      } else if (mode === 'SPOT') {
        s2 = est + '<b>' + mwh(pred) + '</b>. Ponúkame Vám SPOT cenu <b>' + mwh(offer) + '</b> na rok ' + start.getFullYear() + '; cena sleduje vývoj na trhu.';
      } else {
        s2 = est + '<b>' + mwh(pred) + '</b>. Preto Vám ponúkame pevnú (FIX) cenu <b>' + mwh(offer) + '</b> na celé obdobie viazanosti – nezmení sa bez ohľadu na vývoj na trhu.';
      }

      const rowsHtml = rows.map(r =>
        '<div class="rp-tr">' +
          '<div class="rp-per"><b>' + esc(r.lab) + '</b><small>' + esc(r.dates) + '</small></div>' +
          '<div class="rp-old">' + num2(r.old) + '<small> €/MWh</small></div>' +
          '<div class="rp-new">' + num2(r.nw) + '<small> €/MWh</small></div>' +
          '<div class="rp-sav"><b>' + eur0(r.year) + ' / rok</b><small>' + num2(r.unit) + ' €/MWh · ≈ ' + eur0(r.year / 12) + ' mesačne</small></div>' +
        '</div>').join('');

      return '<section class="rp-card ' + cat + '">' +
        '<div class="rp-card-h">' + ICON[cat] + '<h2>' + (cat === 'el' ? 'Elektrina' : 'Plyn') + '</h2>' +
          '<span class="rp-chip">' + esc(mode) + '</span>' +
          '<span class="rp-chip">' + cons.toLocaleString('sk-SK', { maximumFractionDigits: 2 }) + ' MWh / rok</span></div>' +
        '<div class="rp-card-b"><p class="rp-msg">' + s1 + s2 + '</p>' +
          '<div class="rp-tbl"><div class="rp-th"><span>Obdobie</span><span>Očakávaná cena bez zmeny</span><span>Naša cena</span><span>Úspora</span></div>' +
          rowsHtml + '</div></div></section>';
    }).join('');

    // celková úspora (rovnaká hodnota ako v dashboarde) + poznámka o poplatkoch
    const total  = LAST_RESULT ? LAST_RESULT.total : 0;
    const fee1   = num('inp_fee1'), feeM = num('inp_feeM');
    const feeParts = [];
    if (fee1 > 0) feeParts.push('jednorazový poplatok ' + eur0(fee1));
    if (feeM > 0) feeParts.push('mesačný poplatok ' + eur0(feeM));
    const totalNote = feeParts.length
      ? 'Čistá úspora po odrátaní poplatkov za službu (' + feeParts.join(', ') + ').'
      : 'Súčet úspor za celé obdobie viazanosti.';

    const multi = CLIENTS.length > 1;
    const clientName = multi ? CLIENTS.map(c => c.name).filter(Boolean).join(', ') : (CLIENT_NAME || '');
    const ico = (!multi && CLIENT_ICO) ? '<span>IČO ' + esc(CLIENT_ICO) + '</span>' : '';

    return '<div class="rp-page">' +
      '<div class="rp-head"><div><div class="rp-title">Ponuka cien energií</div>' +
        '<div class="rp-client">Odberateľ:<strong>' + esc(clientName) + '</strong>' + ico + '</div></div>' +
        '<div class="rp-date">Dátum ponuky<b>' + esc(dsk(OFFER_DATE)) + '</b><i>Ceny sú orientačné a platné ' + esc(VALIDITY_TEXT) + '</i></div></div>' +
      cards +
      '<div class="rp-total"><div><div class="lbl">Celková úspora</div><div class="note">' + esc(totalNote) + '</div></div>' +
        '<div class="num">' + eur0(total) + '</div></div>' +
      '</div>';
  }

  // Vygeneruje PDF priamo v prehliadači a automaticky ho stiahne (bez tlačového okna).
  // Obsah sa vždy zmenší tak, aby sa zmestil celý na jednu stranu A4 na výšku.
  async function exportToPdf() {
    recalc();
    const html = buildPdfReport();
    if (!html) { alert('Zapnite aspoň jednu komoditu (Elektrina / Plyn).'); return; }
    if (!window.html2canvas || !window.jspdf) {
      alert('Knižnice na tvorbu PDF sa nenačítali (je potrebné pripojenie na internet).');
      return;
    }

    const clientEl = document.getElementById('clientDisp');
    const multi = CLIENTS.length > 1;
    const clientName = multi ? CLIENTS.map(c => c.name).filter(Boolean).join(', ') : (clientEl ? clientEl.textContent.trim() : '');
    const safe = s => String(s || '').replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fileName = 'Ponuka cien energií' + (safe(clientName) ? ' - ' + safe(clientName) : '') + '.pdf';

    const btn = v('pdfExportBtn');
    const host = document.getElementById('pdfReport');
    if (btn) btn.disabled = true;
    try {
      host.innerHTML = html;
      host.classList.add('rp-capture');
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

      const canvas = await window.html2canvas(host, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: host.scrollWidth
      });

      const PW = 210, PH = 297;                         // A4 na výšku (mm)
      let w = PW, h = canvas.height / canvas.width * PW;
      if (h > PH) { w = w * PH / h; h = PH; }           // príliš vysoké -> zmenší sa na jednu stranu
      const x = (PW - w) / 2;                           // pri zmenšení sa vycentruje

      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, 0, w, h);
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert('PDF sa nepodarilo vytvoriť: ' + (err && err.message ? err.message : err));
    } finally {
      host.classList.remove('rp-capture');
      host.innerHTML = '';
      if (btn) btn.disabled = false;
    }
  }

  let STATIC_EL2027  = 135;
  let STATIC_GAS2027 = 45;
  let STATIC_ELMAX   = 120;
  let STATIC_GASMAX  = 35;
  let VALIDITY_TEXT  = '2 dni';
  let CLIENT_NAME    = 'Firma';
  let OFFER_DATE     = todayDate();
  let LAST_RESULT    = null;   // posledný prepočet (pre uloženie do JSON)
  let SUPPLIER       = { el: '', gas: '' };   // dodávateľ (stĺpec C v Exceli)
  // Začiatok viazanosti = deň po (najneskoršom) konci súčasnej viazanosti; nikdy skôr ako 1.1.2027
  // (koniec v roku 2026 sa berie ako 31.12.2026 -> 1.1.2027).
  function startAfterBound(listStr) {
    const arr = String(listStr || '').split(',').map(t => t.trim()).filter(Boolean);
    if (!arr.length) return null;
    const m = arr[arr.length - 1].split('.');          // zoznam je zoradený vzostupne
    let d = new Date(+m[2], +m[1], 1);   // 1. deň mesiaca po konci viazanosti
    if (isNaN(d)) return null;
    const min = new Date(2027, 0, 1);
    return d < min ? min : d;
  }
  let BOUND_UNTIL    = { el: '', gas: '' };   // viazanosť do (stĺpec I v Exceli)
  // Názov spoločnosti: VEĽKÉ PÍSMENÁ, bez právnej formy „s.r.o.“
  function companyName(n) {
    return String(n == null ? '' : n).trim()
      .replace(/[\s,]+(?:spol\.?\s*)?s\.?\s*r\.?\s*o\.?\s*$/i, '')
      .replace(/[\s,]+$/, '').toLocaleUpperCase('sk-SK');
  }
  let CLIENT_FULL    = '';   // úplný názov z analýzy (aj s s.r.o.) – len pre export provízií
  let CLIENT_ICO     = '';   // IČO z analýzy (viac analýz = IČO oddelené čiarkou)
  let OM_LIST        = { el: [], gas: [] };   // odberné miesta z analýzy – používa sa len v exporte provízií
  let CLIENTS        = [];   // pri načítaní 2+ analýz naraz: [{ name }] – zoznam odberateľov do hlavičky

  // Hlavička: jeden odberateľ = veľký názov; viac odberateľov (2+ analýzy naraz) = zoznam názvov pod sebou.
  // Dodávatelia sa zobrazujú len v kartách Elektrina a Plyn (rôzni dodávatelia za sebou).
  function renderClients() {
    const multi = CLIENTS.length > 1;
    const nameEl = document.getElementById('clientDisp');
    const box    = document.getElementById('clientMulti');
    const label  = document.getElementById('clientLabel');
    if (!nameEl || !box) return;
    const icoEl = document.getElementById('clientIco');
    if (icoEl) { icoEl.textContent = (!multi && CLIENT_ICO) ? 'IČO ' + CLIENT_ICO : ''; icoEl.style.display = (!multi && CLIENT_ICO) ? '' : 'none'; }
    nameEl.style.display = multi ? 'none' : '';
    box.style.display    = multi ? '' : 'none';
    if (label) label.textContent = multi ? 'Odberatelia' : 'Odberateľ';
    box.textContent = '';
    if (!multi) { fitClientName(); return; }
    CLIENTS.forEach(c => {
      const row = document.createElement('div');
      row.className = 'client-row cn';
      row.textContent = c.name || '—';
      if (c.ico) { const i = document.createElement('span'); i.className = 'client-ico cr'; i.textContent = 'IČO ' + c.ico; row.appendChild(i); }
      box.appendChild(row);
    });
  }

  // ponechá len platné dátumy (d.m.rrrr), iné hodnoty sa zahodia
  function cleanBound(x) {
    const k = t => { const m = t.split('.'); return new Date(+m[2], +m[1] - 1, +m[0]).getTime(); };
    return String(x || '').split(',').map(t => t.trim())
      .filter(t => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(t)).sort((p, q) => k(p) - k(q)).join(', ');
  }

  function showBoundUntil() {
    ['el', 'gas'].forEach(k => {
      const box = document.getElementById('bind_' + k);
      if (!box) return;
      box.querySelector('b').textContent = BOUND_UNTIL[k] || 'neurčitá';
    });
  }

  function showSuppliers() {
    [['el', SUPPLIER.el], ['gas', SUPPLIER.gas]].forEach(([k, val]) => {
      const e = document.getElementById('supplier_' + k);
      if (!e) return;
      e.textContent = val || '—';
      e.classList.toggle('empty', !val);
    });
  }

  function todayDate() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  // Akákoľvek zmena údaja používateľom -> dátum ponuky = dnes
  function onUserChange() {
    OFFER_DATE = todayDate();
    recalc();
  }

  let ENERGY_ON = { el: true, gas: true };
  // MARŽA (€/MWh): pripočíta sa k PONÚKANÝM cenám načítaným z tabuľky cien (FIX / KOMBI-FIX), kladná aj záporná.
  // 0 = ceny ako z tabuľky. Predpoklady a SPOT ceny sa nemenia.
  let PRICE_MARGIN = 0;

  function parseDateInput2(raw) {
    const d = new Date(raw + 'T00:00:00');
    return isNaN(d) ? new Date() : d;
  }

  let FS_MODE = { el: 'FIX', gas: 'FIX' };
  function setFixSpot(prefix, val) {
    const mode = String(val).trim().toUpperCase();
    const cat = prefix === 'fsEl' ? 'el' : 'gas';
    FS_MODE[cat] = mode;
    const fixEl   = document.getElementById(prefix + '_fix');
    const spotEl  = document.getElementById(prefix + '_spot');
    const kombiEl = document.getElementById(prefix + '_kombi');
    if (!fixEl || !spotEl) return;
    fixEl.className   = 'fs-opt' + (mode === 'FIX'   ? ' active-fix'  : '');
    spotEl.className  = 'fs-opt' + (mode === 'SPOT'  ? ' active-spot' : '');
    if (kombiEl) kombiEl.className = 'fs-opt' + (mode === 'KOMBI' ? ' active-fix' : '');

    {
      // KOMBI riadky (elektrina aj plyn): SPOT na rok 2027 + FIX od 2028
      const show = mode === 'KOMBI' ? '' : 'none';
      const g = id => document.getElementById(cat + id);
      ['KombiRowUspora', 'KombiRow2028', 'KombiRowFix2028', 'KombiRowUsporaFix'].forEach(id => {
        const r = g(id); if (r) r.style.display = show;
      });
      const bottomBadge = g('BottomSavingBadge');
      const maxLabel    = g('MaxLabel');
      if (bottomBadge) bottomBadge.style.display = mode === 'KOMBI' ? 'none' : '';
      if (maxLabel) maxLabel.textContent = mode === 'KOMBI' ? 'Ponúkaná cena SPOT na rok ' + startYearOf(cat)
                                         : mode === 'SPOT'  ? 'Ponúkaná cena SPOT na rok ' + parseDateInput('inp_start_' + cat, new Date(2027, 0, 1)).getFullYear()
                                         : 'Ponúkaná cena FIX ' + fixSpanText(startYearOf(cat), Math.max(1, Math.round(num('inp_years_' + cat)) || 1));
      const predTag = g('PredTag');
      if (predTag) predTag.textContent = (mode === 'SPOT' || mode === 'KOMBI') ? 'SPOT ' : '';
    }
    recalc();
  }

  // Pamäť cien pre každý režim (FIX / SPOT / KOMBI) a komoditu: pri odchode z režimu sa uložia
  // Predpoklad a Ponúkané ceny, pri návrate do režimu sa vrátia.
  const MODE_MEM = { el: {}, gas: {} };
  let LAST_NONKOMBI = { el: null, gas: null };
  let DATA_LOADED = false;   // true po načítaní Excelu / uloženej ponuky
  function resetModeMem() { DATA_LOADED = true; MODE_MEM.el = {}; MODE_MEM.gas = {}; LAST_NONKOMBI.el = null; LAST_NONKOMBI.gas = null; }
  const MEM_FIELDS = ['2027', 'Max', '2028', 'Fix2028'];
  // podpis = počet rokov + začiatok viazanosti; ak sa zmení, uložené ceny režimu už nemusia platiť
  function priceSig(cat) {
    const y = document.getElementById('inp_years_' + cat), st = document.getElementById('inp_start_' + cat);
    return (y ? y.value : '') + '|' + (st ? st.value : '');
  }
  function snapPrices(cat) {
    const o = {};
    MEM_FIELDS.forEach(f => { const e = document.getElementById('inp_' + cat + f); o[f] = e ? e.value : null; });
    o.sig = priceSig(cat);
    return o;
  }
  function restorePrices(cat, snap) {
    MEM_FIELDS.forEach(f => { const e = document.getElementById('inp_' + cat + f); if (e && snap[f] !== null && snap[f] !== undefined) e.value = snap[f]; });
  }
  function wireFixSpotToggle(prefix) {
    const fixEl   = document.getElementById(prefix + '_fix');
    const spotEl  = document.getElementById(prefix + '_spot');
    const kombiEl = document.getElementById(prefix + '_kombi');
    if (!fixEl || !spotEl) return;
    const pick = mode => function() {
      const cat = prefix === 'fsEl' ? 'el' : 'gas';
      const prev = FS_MODE[cat];
      let memSnap = null;
      if (prev !== mode) {
        OFFER_DATE = todayDate();   // zmena režimu = zmena údaja
        const snap = snapPrices(cat);
        MODE_MEM[cat][prev] = snap;                 // zapamätá ceny režimu, z ktorého odchádzame
        if (prev !== 'KOMBI') LAST_NONKOMBI[cat] = snap;
        if (MODE_MEM[cat][mode]) {
          memSnap = MODE_MEM[cat][mode];
          restorePrices(cat, memSnap);              // návrat do režimu: vráti jeho posledné ceny
        } else if (mode === 'KOMBI' || mode === 'SPOT') {
          // prvé prepnutie do KOMBI / SPOT (aj po načítaní dát): Predpoklad = 16, Ponúkaná cena SPOT = 10.
          // Pri ďalšom návrate do režimu sa vrátia posledné hodnoty z pamäte (MODE_MEM).
          const p27 = document.getElementById('inp_' + cat + '2027');
          const pSp = document.getElementById('inp_' + cat + 'Max');
          if (p27) p27.value = 16;
          if (pSp) pSp.value = 10;
        } else if (prev === 'KOMBI' && LAST_NONKOMBI[cat]) {
          restorePrices(cat, LAST_NONKOMBI[cat]);   // režim ešte nebol použitý: ceny spred KOMBI
        }
      }
      setFixSpot(prefix, mode);
      // Ak už boli raz načítané ceny z tabuľky, FIX / KOMBI sa po prepnutí automaticky doplní správnymi cenami
      // pre aktuálny počet rokov a začiatok. Uložené ceny režimu sa použijú len vtedy, keď sa roky ani
      // začiatok od odchodu z režimu nezmenili (inak by boli zastarané).
      if (prev !== mode && mode !== 'SPOT' && PRICE_CACHE[cat]) {
        const keep = !!memSnap && memSnap.sig === priceSig(cat);
        if (!keep) {
          const r = applyCachedPrices(cat);
          recalc();
          if (r && !r.ok) setStatus(r.msg, false);
        }
      }
    };
    fixEl.addEventListener('click', pick('FIX'));
    spotEl.addEventListener('click', pick('SPOT'));
    if (kombiEl) kombiEl.addEventListener('click', pick('KOMBI'));
  }
  wireFixSpotToggle('fsEl');
  wireFixSpotToggle('fsGas');

  function toggleCategory(cat) {
    OFFER_DATE = todayDate();
    ENERGY_ON[cat] = !ENERGY_ON[cat];
    applyCategoryState(cat);
    recalc();
  }

  function applyCategoryState(cat) {
    const on = ENERGY_ON[cat];
    const cardId = cat === 'el' ? 'ecardEl' : 'ecardGas';
    const card = document.getElementById(cardId);
    const sw = document.getElementById('catSwitch_' + cat);
    const label = document.getElementById('catSwitchLabel_' + cat);
    if (card) card.classList.toggle('cat-off', !on);
    if (sw) sw.classList.toggle('on', on);
    if (label) label.textContent = on ? 'ZAP' : 'VYP';

    const contractPanel = document.getElementById('contractPanel_' + cat);
    if (contractPanel) {
      contractPanel.classList.toggle('cat-off', !on);
      contractPanel.querySelectorAll('input').forEach(inp => { inp.disabled = !on; });
    }
  }

  const sk2  = n => n.toLocaleString('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' €';
  // Úspora: suma v zelenej (farba .saving-num), „/ rok“ v bielej (farba textu témy)
  const setSav = (id, n) => { v(id).innerHTML = sk2(n) + '<span class="per-year"> / rok</span>'; };
  const mwh2 = n => n.toLocaleString('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' €/MWh';
  const num2 = n => n.toLocaleString('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dsk  = d => d.toLocaleDateString('sk-SK');
  const num  = id => parseFloat(document.getElementById(id).value) || 0;
  const v    = id => document.getElementById(id);

  function parseDateInput(id, fallback) {
    const raw = v(id).value;
    if (!raw) return fallback;
    const d = new Date(raw + 'T00:00:00');
    return isNaN(d) ? fallback : d;
  }

  function calcContractEnd(start, years) {
    const endYear = start.getFullYear() + years - 1;
    return new Date(endYear, 11, 31);
  }

  function fitClientName() {
    const el = document.getElementById('clientDisp');
    const badge = el.closest('.client-badge');
    if (!el || !badge) return;
    const maxFont = 28;
    const minFont = 13;
    el.style.fontSize = maxFont + 'px';
    let size = maxFont;
    const container = badge.parentElement;
    const available = () => container.getBoundingClientRect().width;
    while (badge.scrollWidth > available() && size > minFont) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  }
  window.addEventListener('resize', fitClientName);

  function toDateInputValue(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Koniec viazanosti nesmie presiahnuť rok 2030 (dostupné ceny v tabuľke).
  // Pri zmene začiatku zníži počet rokov a zablokuje možnosti, ktoré by koniec posunuli za limit.
  const MAX_END_YEAR = 2030;

  // KOMBI: SPOT je vždy len na rok 2027, FIX viazanosť môže začať najskôr 1.1.2028.
  // KOMBI: SPOT = rok začiatku viazanosti, FIX = od 1.1. nasledujúceho roka. Všetko sa riadi poľom „Začiatok viazanosti“.
  function applyKombiStartLimit() {}
  // Text obdobia FIX: „2029“ alebo „Ø 2029–2030“ (priemer, ak je FIX na viac rokov)
  function fixSpanText(firstYear, years) {
    return years > 1 ? 'Ø ' + firstYear + '–' + (firstYear + years - 1) : String(firstYear);
  }
  function startYearOf(cat) { return parseDateInput('inp_start_' + cat, new Date(2027, 0, 1)).getFullYear(); }
  function fixYearOf(cat) { return startYearOf(cat) + (FS_MODE[cat] === 'KOMBI' ? 1 : 0); }
  function contractEndFor(cat, start, years) {
    return FS_MODE[cat] === 'KOMBI' ? new Date(start.getFullYear() + years, 11, 31) : calcContractEnd(start, years);
  }

  function clampContractYears() {
    ['el', 'gas'].forEach(k => {
      const sel = document.getElementById('inp_years_' + k);
      const startInp = document.getElementById('inp_start_' + k);
      if (!sel || !startInp || !startInp.value) return;
      const startYear = parseDateInput('inp_start_' + k, new Date(2027, 0, 1)).getFullYear();
      const maxYears = Math.max(1, MAX_END_YEAR - startYear + (FS_MODE[k] === 'KOMBI' ? 0 : 1));
      Array.from(sel.options).forEach(o => { o.disabled = parseInt(o.value, 10) > maxYears; });
      if (parseInt(sel.value, 10) > maxYears) sel.value = String(Math.min(maxYears, 4));
    });
  }

  function recalc() {
    applyKombiStartLimit();
    clampContractYears();
    const client   = CLIENT_NAME;
    const offerDate = OFFER_DATE;

    const yearsEl  = Math.max(1, Math.round(num('inp_years_el'))  || 2);
    const yearsGas = Math.max(1, Math.round(num('inp_years_gas')) || 2);
    const startEl  = parseDateInput('inp_start_el',  new Date(2027, 0, 1));
    const startGas = parseDateInput('inp_start_gas', new Date(2027, 0, 1));
    const endEl    = contractEndFor('el',  startEl,  yearsEl);
    const endGas   = contractEndFor('gas', startGas, yearsGas);

    const consEl    = num('inp_consEl');
    const consGas   = num('inp_consGas');
    const curEl     = num('inp_curEl');
    const curGas    = num('inp_curGas');
    const fee1      = num('inp_fee1');
    const feeM      = num('inp_feeM');

    const el2027    = num('inp_el2027');
    const gas2027   = num('inp_gas2027');
    const elMax     = num('inp_elMax');
    const gasMax    = num('inp_gasMax');
    const el2028    = num('inp_el2028');
    const elFix2028 = num('inp_elFix2028');
    const gas2028    = num('inp_gas2028');
    const gasFix2028 = num('inp_gasFix2028');

    const unitEl     = el2027 - elMax;
    const unitElFix  = el2028 - elFix2028;
    const unitGas    = gas2027 - gasMax;
    const unitGasFix = gas2028 - gasFix2028;
    const savElYear      = consEl  * unitEl;
    const savElYearFix   = consEl  * unitElFix;
    const savGasYear  = consGas * unitGas;
    const savGasYearFix = consGas * unitGasFix;
    const savEl   = ENERGY_ON.el  ? savElYear  : 0;
    const savGas  = ENERGY_ON.gas ? savGasYear : 0;
    const gross   = savEl + savGas;
    const feeYear = feeM * 12;
    const isElKombi  = FS_MODE.el  === 'KOMBI';
    const isGasKombi = FS_MODE.gas === 'KOMBI';

    if (isGasKombi) {
      v('gasUsporaUnit').textContent    = 'Úspora ' + unitGas.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
      setSav('gasUsporaDisp', savGasYear);
      v('gasUsporaFixUnit').textContent = 'Úspora ' + unitGasFix.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
      setSav('gasUsporaFixDisp', savGasYearFix);
    }

    if (isElKombi) {
      v('elUsporaUnit').textContent    = 'Úspora ' + unitEl.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
      setSav('elUsporaDisp', savElYear);
      v('elUsporaFixUnit').textContent = 'Úspora ' + unitElFix.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
      setSav('elUsporaFixDisp', savElYearFix);
    }

    const activePeriods = [];
    if (ENERGY_ON.el)  activePeriods.push({ start: startEl,  end: endEl  });
    if (ENERGY_ON.gas) activePeriods.push({ start: startGas, end: endGas });

    const yearValues = [];
    let totalNy = 0;
    if (activePeriods.length) {
      const overallStart = new Date(Math.min(...activePeriods.map(p => p.start.getTime())));
      const overallEnd   = new Date(Math.max(...activePeriods.map(p => p.end.getTime())));
      const startYearNum = overallStart.getFullYear();
      const endYearNum   = overallEnd.getFullYear();
      for (let calYear = startYearNum, i = 0; calYear <= endYearNum; calYear++, i++) {
        let gasYearSav = 0;
        if (ENERGY_ON.gas) {
          if (isGasKombi) {
            if (calYear === startGas.getFullYear()) gasYearSav = savGasYear;                                              // SPOT 2027
            else if (calYear > startGas.getFullYear() && calYear <= endGas.getFullYear()) gasYearSav = savGasYearFix; // FIX
          } else if (calYear >= startGas.getFullYear() && calYear <= endGas.getFullYear()) {
            gasYearSav = savGasYear;
          }
        }
        let elYearSav = 0;
        if (ENERGY_ON.el) {
          if (isElKombi) {
            if (calYear === startEl.getFullYear()) elYearSav = savElYear;                                              // SPOT 2027
            else if (calYear > startEl.getFullYear() && calYear <= endEl.getFullYear()) elYearSav = savElYearFix; // FIX
          } else if (calYear >= startEl.getFullYear() && calYear <= endEl.getFullYear()) {
            elYearSav = savElYear;
          }
        }
        const yearGross = elYearSav + gasYearSav;
        const val = i === 0 ? yearGross - fee1 - feeYear : yearGross - feeYear;
        yearValues.push(val);
        totalNy += val;
      }
    }

    v('clientDisp').textContent    = client;
    renderClients();
    v('offerDateDisp').textContent = dsk(offerDate);
    v('viazanostDisp_el').textContent  = dsk(startEl)  + ' – ' + dsk(endEl);
    v('viazanostDisp_gas').textContent = dsk(startGas) + ' – ' + dsk(endGas);

    v('elYearLabel').textContent  = startEl.getFullYear();
    const elFixLbl = document.getElementById('elFixLabel');
    if (elFixLbl) elFixLbl.textContent = 'Ponúkaná cena FIX ' + fixSpanText(startEl.getFullYear() + 1, yearsEl);
    const el2028Lbl = document.getElementById('elYear2Label');
    if (el2028Lbl) el2028Lbl.textContent = (isElKombi ? 1 : 0) + startEl.getFullYear();
    const elMaxLbl = document.getElementById('elMaxLabel');
    if (elMaxLbl && isElKombi) elMaxLbl.textContent = 'Ponúkaná cena SPOT na rok ' + startEl.getFullYear();
    else if (elMaxLbl && FS_MODE.el === 'SPOT') elMaxLbl.textContent = 'Ponúkaná cena SPOT na rok ' + startEl.getFullYear();
    else if (elMaxLbl && FS_MODE.el === 'FIX') elMaxLbl.textContent = 'Ponúkaná cena FIX ' + fixSpanText(startEl.getFullYear(), yearsEl);
    v('gasYearLabel').textContent = startGas.getFullYear();
    const gasFixLbl = document.getElementById('gasFixLabel');
    if (gasFixLbl) gasFixLbl.textContent = 'Ponúkaná cena FIX ' + fixSpanText(startGas.getFullYear() + 1, yearsGas);
    const gas2028Lbl = document.getElementById('gasYear2Label');
    if (gas2028Lbl) gas2028Lbl.textContent = (isGasKombi ? 1 : 0) + startGas.getFullYear();
    // Popis predpokladu pri FIX: „Predpokladaná cena na ďalší rok / ďalšie roky“ (podľa počtu rokov viazanosti).
    // Rok ostáva v skrytom prvku (číta ho aj iný kód). SPOT a SPOT časť KOMBI ostáva „Predpoklad SPOT <rok>“.
    const setPredLabel = (wordId, yearIds, fixLike, years) => {
      const w = document.getElementById(wordId);
      if (w) w.textContent = fixLike ? 'Predpokladaná cena na ' + (years > 1 ? 'ďalšie roky' : 'ďalší rok') : 'Predpoklad';
      yearIds.forEach(id => { const e = document.getElementById(id); if (e) e.style.display = fixLike ? 'none' : ''; });
    };
    setPredLabel('elPredWord',  ['elPredTag',  'elYearLabel'],  FS_MODE.el  === 'FIX', yearsEl);
    setPredLabel('gasPredWord', ['gasPredTag', 'gasYearLabel'], FS_MODE.gas === 'FIX', yearsGas);
    setPredLabel('elPred2Word',  ['elYear2Label'],  true, yearsEl);    // riadok je viditeľný len pri KOMBI (FIX časť)
    setPredLabel('gasPred2Word', ['gasYear2Label'], true, yearsGas);
    const gasMaxLbl = document.getElementById('gasMaxLabel');
    if (gasMaxLbl && isGasKombi) gasMaxLbl.textContent = 'Ponúkaná cena SPOT na rok ' + startGas.getFullYear();
    else if (gasMaxLbl && FS_MODE.gas === 'SPOT') gasMaxLbl.textContent = 'Ponúkaná cena SPOT na rok ' + startGas.getFullYear();
    else if (gasMaxLbl && FS_MODE.gas === 'FIX') gasMaxLbl.textContent = 'Ponúkaná cena FIX ' + fixSpanText(startGas.getFullYear(), yearsGas);

    v('curElDisp').textContent   = num2(curEl);
    v('curGasDisp').textContent  = num2(curGas);

    v('elSavUnit').textContent  = 'Úspora ' + unitEl.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
    v('gasSavUnit').textContent = 'Úspora ' + unitGas.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' €/MWh';
    setSav('elSavYear', savEl);
    setSav('gasSavYear', savGas);

    v('consElBadge').textContent  = consEl.toLocaleString('sk-SK', {maximumFractionDigits:3}) + ' MWh';
    v('consGasBadge').textContent = consGas.toLocaleString('sk-SK', {maximumFractionDigits:2}) + ' MWh';

    const elReg  = consEl  > 30;
    const gasReg = consGas > 100;
    const regBadgeEl  = v('regBadgeEl');
    const regBadgeGas = v('regBadgeGas');
    regBadgeEl.textContent  = elReg  ? 'NEREGULOVANÝ' : 'REGULOVANÝ';
    regBadgeEl.className    = 'reg-badge ' + (elReg  ? 'unregulated' : 'regulated');
    regBadgeGas.textContent = gasReg ? 'NEREGULOVANÝ' : 'REGULOVANÝ';
    regBadgeGas.className   = 'reg-badge ' + (gasReg ? 'unregulated' : 'regulated');

    v('feeYearly').textContent = sk2(feeYear);

    const grid = v('yearGrid');
    grid.innerHTML = '';
    let overallStartYear = activePeriods.length
      ? new Date(Math.min(...activePeriods.map(p => p.start.getTime()))).getFullYear()
      : startEl.getFullYear();
    yearValues.forEach((val, i) => {
      const card = document.createElement('div');
      card.className = 'ycard';
      card.innerHTML = `
        <div class="ycard-label">Rok ${i + 1} · ${overallStartYear + i}</div>
        <div class="ycard-num">${sk2(val)}</div>
        <div class="ycard-note">Čistá úspora (po odrátaní poplatku)</div>
      `;
      grid.appendChild(card);
    });
    const totalCard = document.createElement('div');
    totalCard.className = 'ycard ycard-total';
    totalCard.innerHTML = `
      <div class="ycard-label">Celková úspora</div>
      <div class="ycard-num">${sk2(totalNy)}</div>
      <div class="ycard-note">${yearValues.length} roky spolu</div>
    `;
    grid.appendChild(totalCard);

    LAST_RESULT = { el: savEl, gas: savGas, years: yearValues.slice(), total: totalNy };

    v('headerValidityNote').textContent = `Ceny sú orientačné a platné ${VALIDITY_TEXT}`;
  }

  ['inp_years_el','inp_start_el','inp_years_gas','inp_start_gas',
   'inp_consEl','inp_consGas','inp_curEl','inp_curGas',
   'inp_el2027','inp_gas2027','inp_elMax','inp_gasMax',
   'inp_el2028','inp_elFix2028','inp_gas2028','inp_gasFix2028',
   'inp_fee1','inp_feeM']
    .forEach(id => v(id).addEventListener('input', onUserChange));
  ['inp_years_el','inp_years_gas','inp_start_el','inp_start_gas'].forEach(id => v(id).addEventListener('change', onUserChange));

  // Ručne upravené polia „Predpoklad“ sa pri opätovnom načítaní cien už neprepisujú.
  // (Programatický zápis hodnoty 'input' udalosť nespúšťa, takže príznak nastaví len používateľ.)
  const MANUAL_PRED = new Set();
  const PRED_IDS = ['inp_el2027', 'inp_gas2027', 'inp_el2028', 'inp_gas2028'];
  PRED_IDS.forEach(id => v(id).addEventListener('input', () => MANUAL_PRED.add(id)));
  // Zmena začiatku viazanosti posunie rok predpokladu -> ručná hodnota už neplatí pre nový rok
  v('inp_start_el').addEventListener('change',  () => { MANUAL_PRED.delete('inp_el2027');  MANUAL_PRED.delete('inp_el2028'); });
  v('inp_start_gas').addEventListener('change', () => { MANUAL_PRED.delete('inp_gas2027'); MANUAL_PRED.delete('inp_gas2028'); });
  v('inp_start_el').addEventListener('change',  () => refreshOfferPrice('el'));
  v('inp_start_gas').addEventListener('change', () => refreshOfferPrice('gas'));

  // Zmena počtu rokov viazanosti -> prepočíta sa Ponúkaná cena (max / FIX) z tabuľky cien
  v('inp_years_el').addEventListener('change',  () => refreshOfferPrice('el'));
  v('inp_years_gas').addEventListener('change', () => refreshOfferPrice('gas'));

  // ---------------------------------------------------------------------------
  // IMPORT Z EXCELU – načítava sa len:
  //   1) hlavička odberateľa (prvý hárok): Odberateľ (+ Dátum ponuky, ak je uvedený),
  //   2) pod ňou celkové spotreby a vážené priemery cien (elektrina / plyn),
  //   3) údaje o OM (dodávateľ, koniec viazanosti, druh, spotreba, cena) podľa NÁZVOV STĹPCOV.
  // Bunky E7:H10 sa už NEPOUŽÍVAJÚ (predpoklad 2027 a Ponuka MAX sa doplnia z cenovej tabuľky).
  // Údaj hlavičky = dvojica „popis → hodnota (najbližšia neprázdna bunka vpravo)“:
  //   Odberateľ:                          -> meno klienta
  //   Celková spotreba elektrina / plyn:  -> ročná spotreba (MWh) – stĺpec C; prázdne = klient komoditu nemá
  //   Vážený priemer ceny elektrina / plyn-> súčasná cena (€/MWh)
  // Viazanosť: koniec viazanosti v roku 2026 sa berie ako 31.12.2026 -> začiatok 1.1.2027.
  // Koniec v 2027+ -> začiatok je deň po konci (ďalej podľa počtu rokov, príp. KOMBI).
  // ---------------------------------------------------------------------------
  const HEADER_ROWS = 11;   // hlavička = riadky 1–10 (firma 1–5, údaje 7–10), riadok 11 je prázdny
  const HEADER_COLS = 26;

  function extractXlsx(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellFormula: true, sheetStubs: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const norm = s => String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const hasValue = c => !!c && ((c.v !== undefined && c.v !== null && c.v !== '') || !!c.f);

    const toNum = x => {
      if (typeof x === 'number') return isFinite(x) ? x : null;
      const n = parseFloat(String(x == null ? '' : x).replace(/\s/g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    // ── Hodnota bunky, aj keď je to vzorec bez uloženej (cache) hodnoty ──────────
    // Súbory vytvorené programovo (openpyxl a pod.) majú <f>vzorec</f><v></v>:
    // SheetJS vtedy vráti c.v = undefined. Vzorec sa preto vyhodnotí tu.
    // Vlastný parser (bez eval/Function): čísla, + - * / ( ), odkazy na bunky a rozsahy,
    // SUM, SUMPRODUCT, IF, AVERAGE, MIN, MAX, ABS, ROUND, porovnania.
    const CELL_DEPTH_MAX = 25;
    let evalFormula;   // deklarované vopred (cellNum a evalFormula sa volajú navzájom)
    const cellNum = (ref, depth) => {
      if (depth > CELL_DEPTH_MAX) return null;
      const c = ws[ref];
      if (!c) return null;
      if (c.v !== undefined && c.v !== null && c.v !== '') {
        return typeof c.v === 'number' ? (isFinite(c.v) ? c.v : null) : toNum(c.v);
      }
      if (c.f) return evalFormula(c.f, depth + 1);
      return null;
    };
    const rangeVals = (a, b, depth) => {
      const r = XLSX.utils.decode_range(a + ':' + b);
      const out = [];
      for (let rr = r.s.r; rr <= r.e.r; rr++) {
        for (let cc = r.s.c; cc <= r.e.c; cc++) {
          out.push(cellNum(XLSX.utils.encode_cell({ r: rr, c: cc }), depth));   // null = prázdna/nečíselná
        }
      }
      return out;
    };
    evalFormula = function (f, depth) {
      try {
        const src = String(f).replace(/^\s*=/, '').replace(/\$/g, '');
        let i = 0;
        const peek = () => src[i];
        const skip = () => { while (i < src.length && /\s/.test(src[i])) i++; };
        const scalar = x => {
          if (x && x.range) return x.range.length ? (x.range[0] === null ? 0 : x.range[0]) : 0;
          return x === null ? 0 : x;
        };
        const flat = args => {
          const out = [];
          args.forEach(a => {
            if (a && a.range) a.range.forEach(x => { if (x !== null) out.push(x); });
            else if (a !== null) out.push(a);
          });
          return out;
        };
        function parseCompare() {
          const l = parseAdd();
          skip();
          const m = /^(<=|>=|<>|=|<|>)/.exec(src.slice(i));
          if (!m) return l;
          i += m[1].length;
          const a = scalar(l), b = scalar(parseAdd());
          switch (m[1]) {
            case '<=': return a <= b ? 1 : 0;
            case '>=': return a >= b ? 1 : 0;
            case '<>': return a !== b ? 1 : 0;
            case '=':  return a === b ? 1 : 0;
            case '<':  return a <  b ? 1 : 0;
            default:   return a >  b ? 1 : 0;
          }
        }
        function parseAdd() {
          let l = parseMul();
          for (;;) {
            skip();
            if (peek() === '+')      { i++; l = scalar(l) + scalar(parseMul()); }
            else if (peek() === '-') { i++; l = scalar(l) - scalar(parseMul()); }
            else break;
          }
          return l;
        }
        function parseMul() {
          let l = parseUnary();
          for (;;) {
            skip();
            if (peek() === '*') { i++; l = scalar(l) * scalar(parseUnary()); }
            else if (peek() === '/') {
              i++;
              const d = scalar(parseUnary());
              if (d === 0) throw new Error('div0');
              l = scalar(l) / d;
            } else break;
          }
          return l;
        }
        function parseUnary() {
          skip();
          if (peek() === '-') { i++; return -scalar(parseUnary()); }
          if (peek() === '+') { i++; return scalar(parseUnary()); }
          return parsePrimary();
        }
        function parseArgs() {
          const args = [];
          skip();
          if (peek() === ')') { i++; return args; }
          for (;;) {
            args.push(parseCompare());
            skip();
            if (peek() === ',' || peek() === ';') { i++; continue; }
            if (peek() === ')') { i++; break; }
            throw new Error('args');
          }
          return args;
        }
        function parsePrimary() {
          skip();
          if (peek() === '(') {
            i++;
            const inner = parseCompare();
            skip();
            if (peek() !== ')') throw new Error('paren');
            i++;
            return inner;
          }
          const nm = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i));
          if (nm) { i += nm[0].length; return parseFloat(nm[0]); }
          const fn = /^([A-Za-z][A-Za-z0-9.]*)\s*\(/.exec(src.slice(i));
          if (fn) {
            i += fn[0].length;
            const name = fn[1].toUpperCase();
            const args = parseArgs();
            const nums = flat(args);
            switch (name) {
              case 'IF':      return scalar(args[0]) ? scalar(args[1] === undefined ? 0 : args[1])
                                                     : scalar(args[2] === undefined ? 0 : args[2]);
              case 'SUM':     return nums.reduce((a, b) => a + b, 0);
              case 'AVERAGE': if (!nums.length) throw new Error('avg'); return nums.reduce((a, b) => a + b, 0) / nums.length;
              case 'MIN':     return nums.length ? Math.min.apply(null, nums) : 0;
              case 'MAX':     return nums.length ? Math.max.apply(null, nums) : 0;
              case 'ABS':     return Math.abs(scalar(args[0]));
              case 'ROUND': { const k = Math.pow(10, args[1] === undefined ? 0 : scalar(args[1])); return Math.round(scalar(args[0]) * k) / k; }
              case 'SUMPRODUCT': {
                const a = args[0] && args[0].range ? args[0].range : [];
                const b = args[1] && args[1].range ? args[1].range : [];
                let t = 0;
                for (let k = 0; k < Math.min(a.length, b.length); k++) t += (a[k] || 0) * (b[k] || 0);
                return t;
              }
              default: throw new Error('fn ' + name);
            }
          }
          const rm = /^([A-Za-z]{1,3}\d+)(?::([A-Za-z]{1,3}\d+))?/.exec(src.slice(i));
          if (rm) {
            i += rm[0].length;
            if (rm[2]) return { range: rangeVals(rm[1].toUpperCase(), rm[2].toUpperCase(), depth) };
            const n = cellNum(rm[1].toUpperCase(), depth);
            return n === null ? 0 : n;
          }
          throw new Error('token');
        }
        const res = parseCompare();
        skip();
        if (i < src.length) throw new Error('trailing');
        const out = scalar(res);
        return (typeof out === 'number' && isFinite(out)) ? out : null;
      } catch (e) {
        return null;
      }
    };
    // číselná hodnota bunky pre import (aj z vzorca bez cache), inak null
    const numOfCell = c => {
      if (!c) return null;
      if (c.v !== undefined && c.v !== null && c.v !== '') return toNum(c.v);
      if (c.f) return evalFormula(c.f, 1);
      return null;
    };

    const toDate = c => {
      if (!c) return null;
      if (c.f && /^\s*TODAY\s*\(\s*\)\s*$/i.test(c.f)) {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
      }
      let x = c.v;
      // vzorec bez uloženej hodnoty -> skús vyhodnotiť (výsledok = excelovské sériové číslo)
      if ((x === undefined || x === null || x === '') && c.f) x = evalFormula(c.f, 1);
      if (Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x)) {
        const r = new Date(x.getTime() + 12 * 3600 * 1000);
        return new Date(r.getFullYear(), r.getMonth(), r.getDate());
      }
      if (typeof x === 'number') {
        // len rozumný rozsah sériových čísel (rok 2000–2099); iné čísla nie sú dátum
        if (x < 36526 || x > 73415) return null;
        const u = new Date(Math.round((x - 25569) * 86400 * 1000));
        return isNaN(u) ? null : new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
      }
      if (typeof x === 'string') {
        const mk = (y, mo, d) => {
          if (y < 100) y += 2000;
          const r = new Date(y, mo - 1, d);
          return (r.getFullYear() === y && r.getMonth() === mo - 1 && r.getDate() === d) ? r : null;
        };
        // d.m.rrrr / d. m. rrrr / d/m/rrrr / d-m-rrrr / d.m.rr – aj s textom okolo („do 31.12.2027“)
        let m = /(\d{1,2})\s*[.\/\-]\s*(\d{1,2})\s*[.\/\-]\s*(\d{4}|\d{2})(?!\d)/.exec(x);
        if (m) { const r = mk(+m[3], +m[2], +m[1]); if (r) return r; }
        // rrrr-mm-dd
        m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(x);
        if (m) { const r = mk(+m[1], +m[2], +m[3]); if (r) return r; }
        // m/rrrr alebo mm.rrrr -> posledný deň mesiaca
        m = /^\s*(\d{1,2})\s*[.\/]\s*(\d{4})\s*$/.exec(x);
        if (m && +m[1] >= 1 && +m[1] <= 12) return new Date(+m[2], +m[1], 0);
      }
      return null;
    };

    // popis (bez diakritiky, malými písmenami) -> kľúč údaja
    const headerKey = n => {
      const el  = n.includes('elektrin');
      const gas = n.includes('plyn');
      if (n.startsWith('odberatel') || n.startsWith('obchodne meno')) return 'client';
      if (n === 'ico' || /^ico(?![a-z])/.test(n)) return 'ico';          // „IČO“, „IČO:“, „IČO / DIČ“, „IČO odberateľa“
      if (n.startsWith('datum ponuky'))        return 'offerDate';
      if (n.startsWith('viazanost kontraktu')) return 'years';
      if (n.startsWith('zaciatok'))            return 'start';
      if (n.includes('spotreba'))              return el ? 'consEl'  : (gas ? 'consGas'  : null);
      if (n.includes('priemer ceny'))          return el ? 'curEl'   : (gas ? 'curGas'   : null);
      return null;
    };

    // 1) prejdi hlavičku a zober dvojice popis -> hodnota
    const found = {};
    for (let r = 0; r < HEADER_ROWS; r++) {
      const cells = [];
      for (let c = 0; c < HEADER_COLS; c++) {
        if (r >= 6 && r <= 9 && c >= 4 && c <= 7) continue;   // E7:H10 sa nepoužíva
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (hasValue(cell)) cells.push(cell);
      }
      for (let i = 0; i < cells.length - 1; i++) {
        const lab = cells[i];
        if (typeof lab.v !== 'string') continue;
        const key = headerKey(norm(lab.v));
        if (!key) continue;
        const valCell = cells[i + 1];
        if (typeof valCell.v === 'string' && headerKey(norm(valCell.v))) continue; // ďalší popis, nie hodnota
        if (found[key] === undefined) found[key] = valCell;
        i++; // hodnotová bunka je spotrebovaná
      }
    }

    // 1-spotreba) ROČNÁ SPOTREBA – ZÁKLAD JE HLAVIČKA, STĹPEC C (riadok s popisom
    //     „Celková spotreba elektrina / plyn“ v stĺpci A, hodnota v stĺpci C).
    //     • číslo > 0  -> ročná spotreba komodity (má prednosť pred tabuľkou OM)
    //     • prázdne (alebo 0 / nečíselné) -> klient danú komoditu NEMÁ (cons = null)
    //     • popis v hlavičke vôbec nie je -> (undefined) použije sa záloha z tabuľky OM
    const headerCons = {};
    for (let r = 0; r < HEADER_ROWS; r++) {
      const a = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (!a || typeof a.v !== 'string') continue;
      const n = norm(a.v);
      if (n.startsWith('vazeny') || n.includes('priemer') || !n.includes('spotreba')) continue;
      const cat = n.includes('elektrin') ? 'el' : (n.includes('plyn') ? 'gas' : null);
      if (!cat || headerCons[cat] !== undefined) continue;
      const cC = ws[XLSX.utils.encode_cell({ r, c: 2 })];          // stĺpec C
      const val = hasValue(cC) ? numOfCell(cC) : null;
      headerCons[cat] = (val !== null && val > 0) ? val : null;
    }

    // 1-cena) CENA KOMODITY – hlavička „Vážený priemer ceny elektrina / plyn“, hodnota v stĺpci C
    //     (ak je stĺpec C prázdny, berie sa najbližšia neprázdna bunka vpravo – found.curEl / found.curGas).
    //     Použije sa ako náhrada pre OM, pri ktorom cena v hlavnej tabuľke nie je zapísaná.
    const headerPrice = { el: null, gas: null };
    for (let r = 0; r < HEADER_ROWS; r++) {
      const a = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (!a || typeof a.v !== 'string') continue;
      const n = norm(a.v);
      if (!n.includes('priemer ceny')) continue;
      const cat = n.includes('elektrin') ? 'el' : (n.includes('plyn') ? 'gas' : null);
      if (!cat || headerPrice[cat] !== null) continue;
      const cC = ws[XLSX.utils.encode_cell({ r, c: 2 })];
      const val = hasValue(cC) ? numOfCell(cC) : null;
      if (val !== null && val > 0) headerPrice[cat] = val;
    }

    // 1b) dodávateľ – stĺpec C pod hlavičkou „Dodávateľ“ (elektrina, potom plyn)
    const readSuppliers = () => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      // Excel môže hlásiť dimenziu až po riadok 1 048 576 (formátované prázdne bunky) –
      // preto sa skutočný posledný riadok určí z reálne obsadených buniek.
      let lastRow = 0;
      Object.keys(ws).forEach(k => {
        if (k.charAt(0) === '!') return;
        const cell = ws[k];
        if (!hasValue(cell)) return;
        const rr = XLSX.utils.decode_cell(k).r;
        if (rr > lastRow) lastRow = rr;
      });
      range.e.r = Math.min(range.e.r, lastRow);
      // Stĺpce sa hľadajú podľa názvov v hlavičke tabuľky OM („Dodávateľ“, „Koniec viazanosti“, „Spotreba“,
      // „Druh“, „Cena komodity“). Ak hlavička chýba, použijú sa pôvodné pevné stĺpce (C, I, J, K, L).
      const defaultCols = () => ({ sup: 2, bound: 8, cons: 9, kind: 10, price: 11, om: null });
      const cols = { el: defaultCols(), gas: defaultCols() };
      let section = null;
      const sup   = { el: [], gas: [] };
      const boundDates = { el: [], gas: [] };
      const boundBad = { el: [], gas: [] };      // hodnoty v stĺpci „koniec viazanosti“, ktoré sa nepodarilo prečítať ako dátum
      const kinds    = { el: [], gas: [] };      // druh z stĺpca K
      const dataRows = { el: [], gas: [] };      // spotreba (J) a cena (L) z riadkov OM
      const omCodes  = { el: [], gas: [] };      // kódy odberných miest (EIC / POD)
      const OM_RE = /^(\d{2}Z[A-Z0-9]{13}|SK[A-Z]{3,}\d{6,})$/i;
      const add = (arr, t) => { if (t && !arr.includes(t)) arr.push(t); };
      const p2  = n => String(n).padStart(2, '0');
      const fmtD = d => d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
      for (let r = 0; r <= range.e.r; r++) {
        const a = ws[XLSX.utils.encode_cell({ r, c: 0 })];
        const aN = a && typeof a.v === 'string' ? norm(a.v) : '';
        if (aN.includes('elektrin') && !aN.startsWith('vazeny') && !aN.includes('priemer') && !aN.includes('spotreba')) { section = 'el';  continue; }
        if (aN.includes('plyn')     && !aN.startsWith('vazeny') && !aN.includes('priemer') && !aN.includes('spotreba')) { section = 'gas'; continue; }
        if (!section) continue;
        if (aN.startsWith('spolu')) { section = null; continue; }

        // hlavička tabuľky OM (v stĺpci A „OM #“) -> zistí, v ktorom stĺpci je ktorý údaj
        if (aN.startsWith('om')) {
          const found = {};
          for (let cc = 0; cc < HEADER_COLS; cc++) {
            const h = ws[XLSX.utils.encode_cell({ r, c: cc })];
            if (!h || typeof h.v !== 'string') continue;
            const hn = norm(h.v);
            if (hn.startsWith('dodavatel'))                     found.sup   = cc;
            else if (cc > 0 && (hn.includes('eic') || hn === 'pod' || hn.startsWith('pod ') || hn.includes('odberne miesto') || hn.includes('cislo om') || hn.includes('kod om') || hn.includes('om kod') || hn.includes('identifikac'))) found.om = cc;
            else if (!hn.startsWith('zaciatok') && !hn.startsWith('doba') && (hn.includes('viazanost') || hn.startsWith('koniec') || hn.includes('konca') || hn.includes('ukoncen'))) found.bound = cc;
            else if (hn.startsWith('spotreba'))                 found.cons  = cc;
            else if (hn === 'druh' || hn.startsWith('druh '))   found.kind  = cc;
            else if (hn.startsWith('cena komodity'))            found.price = cc;
          }
          if (Object.keys(found).length) Object.assign(cols[section], found);
          continue;
        }
        const colC = cols[section].sup, colI = cols[section].bound;
        const colJ = cols[section].cons, colK = cols[section].kind, colL = cols[section].price;

        // stĺpec C – dodávateľ
        const c = ws[XLSX.utils.encode_cell({ r, c: colC })];
        if (c && typeof c.v === 'string') {
          const t = c.v.trim();
          if (t && norm(t) !== 'dodavatel') add(sup[section], t);
        }

        // riadok OM = má v stĺpci A číslo OM alebo je vyplnený dodávateľ/spotreba
        const cJ = ws[XLSX.utils.encode_cell({ r, c: colJ })];
        const cK = ws[XLSX.utils.encode_cell({ r, c: colK })];
        const cL = ws[XLSX.utils.encode_cell({ r, c: colL })];
        const isOmRow = !!a && (typeof a.v === 'number' || /^\d+$/.test(String(a.v == null ? '' : a.v).trim()));
        if (isOmRow) {
          const cons  = numOfCell(cJ);
          const price = numOfCell(cL);
          dataRows[section].push({ cons: cons, price: price });
          // kód OM: stĺpec z hlavičky tabuľky, inak prvá bunka v riadku s tvarom EIC / POD
          let omv = '';
          if (cols[section].om !== null) {
            const oc = ws[XLSX.utils.encode_cell({ r, c: cols[section].om })];
            if (oc && oc.v != null) omv = String(oc.v).replace(/\s+/g, '');
          }
          if (!omv) {
            for (let cc = 1; cc < HEADER_COLS; cc++) {
              const oc = ws[XLSX.utils.encode_cell({ r, c: cc })];
              const t = oc && oc.v != null ? String(oc.v).replace(/\s+/g, '') : '';
              if (OM_RE.test(t)) { omv = t; break; }
            }
          }
          if (omv) add(omCodes[section], omv);
          // druh – stĺpec K: FIX / SPOT / KOMBI (aj v tvare „Fix“, „spotová“, „fixná“ …)
          if (cK && cK.v != null) {
            const kn = norm(cK.v);
            const kind = kn.startsWith('fix') ? 'FIX'
                       : kn.startsWith('spot') ? 'SPOT'
                       : kn.startsWith('kombi') ? 'KOMBI' : null;
            if (kind) kinds[section].push({ kind: kind, cons: cons || 0 });
          }
        }

        // stĺpec I – dátum do kedy viazanosť (len dátum; text/prázdne = neurčitá)
        const i = ws[XLSX.utils.encode_cell({ r, c: colI })];
        if (hasValue(i)) {
          let d = toDate(i);
          if (!d && i.v != null && String(i.v).trim() !== '' && !/neurc|neobmed|bez /.test(norm(i.v))) boundBad[section].push('riadok ' + (r + 1) + ': „' + String(i.v).trim() + '“');
          if (d && d.getFullYear() === 2026) d = new Date(2026, 11, 31);   // koniec v roku 2026 = 31.12.2026
          if (d && !boundDates[section].some(x => x.getTime() === d.getTime())) boundDates[section].push(d);
        }
      }
      const fmtList = arr => arr.slice().sort((x, y) => x - y).map(fmtD).join(', ');
      // druh: FIX / SPOT / KOMBI; pri viacerých OM rozhoduje najväčšia spotreba
      const pickKind = cat => {
        const list = kinds[cat];
        if (!list.length) return null;
        const w = {};
        list.forEach(k => { w[k.kind] = (w[k.kind] || 0) + (k.cons > 0 ? k.cons : 1); });
        return Object.keys(w).sort((a, b) => w[b] - w[a])[0];
      };
      const sumRows = cat => {
        const rws = dataRows[cat];
        const cons = rws.reduce((a, r) => a + (r.cons || 0), 0);
        const withCons = rws.filter(r => r.cons !== null);
        // cena komodity: z hlavnej tabuľky pri OM; ak pri OM nie je zapísaná, použije sa cena z hlavičky
        const hp = headerPrice[cat];
        const eff = rws.map(r => ({ cons: r.cons, price: (r.price !== null && r.price > 0) ? r.price : hp }));
        const priced = eff.filter(r => r.price !== null);
        const pricedCons = priced.reduce((a, r) => a + (r.cons || 0), 0);
        return {
          cons:  withCons.length ? cons : null,
          price: priced.length
                   ? (pricedCons > 0
                        ? priced.reduce((a, r) => a + (r.cons || 0) * r.price, 0) / pricedCons
                        : priced.reduce((a, r) => a + r.price, 0) / priced.length)
                   : null
        };
      };
      return {
        sup:   { el: sup.el.join(', '),   gas: sup.gas.join(', ') },
        om:    omCodes,
        bound: { el: fmtList(boundDates.el), gas: fmtList(boundDates.gas) },
        boundBad: boundBad,
        kind:  { el: pickKind('el'), gas: pickKind('gas') },
        kindsRaw: kinds,
        rows:  { el: sumRows('el'),  gas: sumRows('gas') }
      };
    };
    const rs = readSuppliers();
    const num = key => (found[key] ? numOfCell(found[key]) : null);

    const nameCell = found.client;
    const yrsRaw = num('years');
    const out = {
      name:      nameCell && typeof nameCell.v === 'string' ? companyName(nameCell.v) : '',
      full:      nameCell && typeof nameCell.v === 'string' ? nameCell.v.trim() : '',
      ico:       (() => {
        const c = found.ico; if (!c || c.v == null) return '';
        let t = String(c.v).replace(/\s+/g, '');
        if (/^\d{5,7}$/.test(t)) t = t.padStart(8, '0');          // IČO uložené ako číslo bez úvodných núl
        return t;
      })(),
      om:        rs.om,
      offerDate: found.offerDate ? toDate(found.offerDate) : null,
      years:     (yrsRaw !== null && yrsRaw > 0) ? Math.min(4, Math.max(1, Math.round(yrsRaw))) : null,
      start:     found.start ? toDate(found.start) : null,
      sup:       rs.sup,
      bound:     rs.bound,
      kindsRaw:  rs.kindsRaw,
      boundBad:  rs.boundBad
    };
    // Zdroj pravdy pre SPOTREBU = hlavička, stĺpec C (prázdne = komodita sa nepoužíva).
    // Tabuľka OM slúži na výpočet (vážený priemer ceny) a ako záloha, ak v hlavičke popis chýba.
    // cons === null = klient nemá danú komodity (prázdna spotreba).
    [['el', 'consEl', 'curEl', 'el2027', 'elMax'], ['gas', 'consGas', 'curGas', 'gas2027', 'gasMax']]
      .forEach(([cat, kCons, kCur, k27, kMax]) => {
        // Spotreba: základ = hlavička (stĺpec C). Prázdne = klient komoditu nemá (null).
        // Tabuľka OM slúži len ako záloha, ak hlavička popis spotreby vôbec neobsahuje.
        // Spotreba aj cena komodity = VÝHRADNE z hlavičky, stĺpec C (tabuľka OM sa na to nepoužíva).
        const cons = headerCons[cat] !== undefined ? headerCons[cat] : null;
        const cur  = headerPrice[cat];
        const f27 = num(k27);                       // ak Excel nemá predpoklad, použije sa súčasná cena
        out[cat] = { cons: cons, cur: cur, f27: f27 !== null ? f27 : cur, max: num(kMax) };
      });
    return out;
  }

  // ── Spojenie viacerých firiem (súborov) do jednej analýzy ─────────────────────
  // spotreby sa sčítajú; ceny (súčasná, predpoklad 2027, Ponuka MAX) sa spriemerujú
  // váhou ročnej spotreby danej komodity. Jeden súbor = správanie ako doteraz.
  function applyImports(list, fileNames) {
    const multi   = list.length > 1;
    const missing = [];
    const warnings = [];
    const tag = i => multi ? fileNames[i] + ': ' : '';
    const r4  = x => (x === null || !multi) ? x : Math.round(x * 1e4) / 1e4;
    const r1  = x => x === null ? x : Math.round(x * 10) / 10;   // ceny €/MWh na 1 desatinné miesto

    list.forEach((d, i) => {
      if (!d.name)      missing.push(tag(i) + 'Odberateľ');
      [['el', 'Elektrina', 'elektrina'], ['gas', 'Plyn', 'plyn']].forEach(([cat, L1, L2]) => {
        const x = d[cat];
        if (x.cons === null) return;                // komodita sa nepoužíva
        if (x.cur === null) missing.push(tag(i) + 'Vážený priemer ceny ' + L2);
      });
    });

    list.forEach((d, i) => {
      [['el', 'elektrina'], ['gas', 'plyn']].forEach(([cat, L]) => {
        const bad = d.boundBad && d.boundBad[cat];
        if (bad && bad.length) warnings.push(tag(i) + 'koniec viazanosti (' + L + ') sa nepodarilo prečítať – ' + bad.join('; '));
      });
    });
    // spoločné údaje – z prvého súboru, pri rozdieloch upozornenie
    const firstOf = key => { for (const d of list) if (d[key] !== null && d[key] !== '') return d[key]; return null; };
    const years = firstOf('years');
    const start = firstOf('start');
    const od    = firstOf('offerDate');
    if (multi) {
      if (list.some(d => d.years !== null && d.years !== years)) warnings.push('rozdielna viazanosť v rokoch (použitá ' + years + ')');
      if (start && list.some(d => d.start && d.start.getTime() !== start.getTime())) warnings.push('rozdielny začiatok viazanosti (použitý z prvého súboru)');
    }

    // názov: všetky odberateľov spojí
    const names = [];
    list.forEach(d => { if (d.name && !names.includes(d.name)) names.push(d.name); });

    // súčty a vážené priemery
    const total = cat => {
      const xs = list.map(d => d[cat].cons).filter(c => c !== null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
    };
    const wavg = (cat, key) => {
      const rows = list.map(d => d[cat]).filter(x => x[key] !== null);
      if (!rows.length) return null;
      const tot = rows.reduce((a, x) => a + (x.cons || 0), 0);
      if (tot > 0) return rows.reduce((a, x) => a + (x.cons || 0) * x[key], 0) / tot;
      return rows.reduce((a, x) => a + x[key], 0) / rows.length;
    };

    // dodávatelia a viazanosť – zjednotenie
    const uniq = (cat, getter, sep) => {
      const o = [];
      list.forEach(d => String(getter(d)[cat] || '').split(sep).map(t => t.trim()).filter(Boolean)
        .forEach(t => { if (!o.includes(t)) o.push(t); }));
      return o;
    };
    const toD = t => { const m = t.split('.'); return new Date(+m[2], +m[1] - 1, +m[0]).getTime(); };
    SUPPLIER = { el: uniq('el', d => d.sup, ',').join(', '), gas: uniq('gas', d => d.sup, ',').join(', ') };
    BOUND_UNTIL = {
      el:  uniq('el',  d => d.bound, ',').sort((x, y) => toD(x) - toD(y)).join(', '),
      gas: uniq('gas', d => d.bound, ',').sort((x, y) => toD(x) - toD(y)).join(', ')
    };
    showSuppliers();
    showBoundUntil();

    // druh FIX / SPOT / KOMBI – rozhoduje najväčšia spotreba naprieč všetkými súbormi
    const pickKind = cat => {
      const w = {};
      list.forEach(d => (d.kindsRaw[cat] || []).forEach(k => { w[k.kind] = (w[k.kind] || 0) + (k.cons > 0 ? k.cons : 1); }));
      const keys = Object.keys(w);
      return keys.length ? keys.sort((a, b) => w[b] - w[a])[0] : null;
    };

    // zápis do polí analýzy
    if (names.length) CLIENT_NAME = names.join(' + ');
    CLIENTS = multi ? list.map(d => ({ name: d.name, full: d.full || d.name, ico: d.ico || '' })) : [];
    CLIENT_FULL = [...new Set(list.map(d => d.full || d.name).filter(Boolean))].join(' + ');
    CLIENT_ICO = [...new Set(list.map(d => d.ico).filter(Boolean))].join(', ');
    OM_LIST = { el: [...new Set([].concat(...list.map(d => (d.om && d.om.el) || [])))], gas: [...new Set([].concat(...list.map(d => (d.om && d.om.gas) || [])))] };
    if (od) OFFER_DATE = od;
    MANUAL_PRED.clear();
    // Viazanosť je po načítaní analýzy vždy 2 roky (hodnota z Excelu sa ignoruje).
    v('inp_years_el').value = '2'; v('inp_years_gas').value = '2';
    // Začiatok viazanosti = deň po konci súčasnej viazanosti (pri viacerých OM po najneskoršom konci);
    // koniec v roku 2026 = 31.12.2026 -> začiatok 1.1.2027. Ak koniec nie je určený: „Začiatok“ z Excelu, inak 1.1.2027.
    [['el', 'inp_start_el'], ['gas', 'inp_start_gas']].forEach(([cat, id]) => {
      let d = startAfterBound(BOUND_UNTIL[cat]) || start || new Date(2027, 0, 1);
      if (d < new Date(2027, 0, 1)) d = new Date(2027, 0, 1);
      v(id).value = toDateInputValue(d);
    });

    const consMissing = { el: false, gas: false };
    [['el', 'inp_consEl', 'inp_curEl', 'inp_el2027', 'inp_elMax', 'fsEl'],
     ['gas', 'inp_consGas', 'inp_curGas', 'inp_gas2027', 'inp_gasMax', 'fsGas']]
      .forEach(([cat, idCons, idCur, id27, idMax, fs]) => {
        const cons = total(cat);
        if (cons === null) {
          // klient komoditu nemá: všetky hodnoty = 0 a komodita sa vypne
          consMissing[cat] = true;
          ENERGY_ON[cat] = false;
          [idCons, idCur, id27, idMax, 'inp_' + cat + '2028', 'inp_' + cat + 'Fix2028']
            .forEach(id => { v(id).value = 0; });
          resetModeMem();
          setFixSpot(fs, 'FIX');
          applyCategoryState(cat);
          return;
        }
        v(idCons).value = r4(cons);
        ENERGY_ON[cat] = true;
        applyCategoryState(cat);

        const max = wavg(cat, 'max');
        if (!consMissing[cat] && max !== null) v(idMax).value = r1(max);

        const cur = wavg(cat, 'cur');
        if (cur !== null) {
          v(idCur).value = r1(cur);
          v(id27).value  = r1(cur);                 // záloha, ak Excel nemá predpoklad
          const kind = pickKind(cat);
          resetModeMem();
          if (kind) setFixSpot(fs, kind);
        }
        const f27 = wavg(cat, 'f27');
        if (f27 !== null) v(id27).value = r1(f27);
      });

    recalc();

    // rozpis po firmách (zobrazí sa v tooltipe stavu importu)
    const fmt = x => x === null ? '—' : (Math.round(x * 100) / 100).toLocaleString('sk-SK');
    const fmtP = x => x === null ? '—' : (Math.round(x * 10) / 10).toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1});
    const detail = list.map((d, i) =>
      (fileNames[i] || '') + ' – ' + (d.name || '?') +
      '\n   elektrina: ' + fmt(d.el.cons) + ' MWh, ' + fmtP(d.el.cur) + ' €/MWh' +
      '\n   plyn: ' + fmt(d.gas.cons) + ' MWh, ' + fmtP(d.gas.cur) + ' €/MWh').join('\n');
    return { missing: missing, warnings: warnings, detail: detail };
  }

  // jeden súbor aj viac súborov naraz
  function parseXlsx(buffers, fileNames) {
    const bufs = Array.isArray(buffers) ? buffers : [buffers];
    const names = fileNames || bufs.map((b, i) => 'súbor ' + (i + 1));
    const list = bufs.map((b, i) => {
      try { return extractXlsx(b); }
      catch (err) { err.message = names[i] + ': ' + err.message; throw err; }
    });
    return applyImports(list, names);
  }

  document.getElementById('xlsxFileInput').addEventListener('change', function(e) {
    const files = Array.from(e.target.files || []);
    const status = v('importStatus');
    if (!files.length) return;

    const readOne = f => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = evt => resolve(evt.target.result);
      reader.onerror = () => reject(new Error('Súbor sa nedal otvoriť: ' + f.name));
      reader.readAsArrayBuffer(f);
    });

    Promise.all(files.map(readOne)).then(bufs => {
      const res = parseXlsx(bufs, files.map(f => f.name));
      const label = files.length > 1 ? files.length + ' súbory spolu' : files[0].name;
      if (res.missing.length) {
        status.textContent = '✗ ' + label + ' – v hlavičke chýba: ' + res.missing.join(', ');
        status.className = 'import-status err';
      } else {
        status.textContent = files.length > 1
          ? '✓ Dáta načítané (' + files.length + ' firmy sčítané)' + (res.warnings.length ? ' – pozor: ' + res.warnings.join('; ') : '')
          : '✓ Dáta načítané';
        status.className = 'import-status ok';
      }
      status.title = status.textContent + (res.detail ? '\n' + res.detail : '');
      // Po každom načítaní Excelu sa hneď načítajú aj ceny (Ponúkaná cena, Predpoklad) z Google tabuľky.
      return loadPrices({ text: status.textContent, ok: !res.missing.length, title: status.title });
    }).catch(err => {
      status.textContent = '✗ Chyba pri čítaní súboru' + (files.length > 1 && err && err.message ? ' (' + err.message + ')' : '');
      status.className = 'import-status err';
      status.title = status.textContent;
      console.error(err);
    });
    this.value = '';
  });


  // ---------------------------------------------------------------------------
  // NAČÍTAŤ CENY z Google tabuľky
  // Zdroj: hárok „Orientačné ceny energií“ (horná tabuľka), riadky dodávateľov:
  //   elektrina A7:K10 (hlavička v riadku 6), plyn A13:K16 (hlavička v riadku 12)
  //   stĺpce: B=2027 C=2028 D=2029 E=2030 | F=Ø27-28 G=Ø27-29 H=Ø27-30 I=Ø28-29 J=Ø28-30
  //   (hlavičky v hárku sú už správne popísané)
  // Cena sa vyberie podľa začiatku viazanosti a počtu rokov a vloží do „Ponúkaná cena“.
  // Do „Predpoklad <rok>“ sa vloží cena pre rok začiatku viazanosti (stĺpce B..E); pri KOMBI aj pre 2. rok.
  // Polia zostávajú editovateľné. Z riadkov dodávateľov sa berie iba MVM (PRICE_SUPPLIER).
  // Tabuľka musí byť zdieľaná „Ktokoľvek s odkazom – zobraziť“.
  // ---------------------------------------------------------------------------
  const PRICE_SHEET_ID  = '1yjOl0-yYSOI2lTCxflBfZWiohGkQmJkMVJLIlxGBUdU';
  const PRICE_SHEET_GID = '1494981420';
  const PRICE_RANGES    = { el: 'A7:K10', gas: 'A13:K16' };
  const PRICE_SUPPLIER  = 'MVM';   // čítajú sa a používajú iba ceny tohto dodávateľa

  // stĺpec (index v rozsahu A..J) pre jednotlivé roky a pre priemery
  const PRICE_YEAR_COL = { 2027: 1, 2028: 2, 2029: 3, 2030: 4 };
  const PRICE_AVG_COL  = { '2027-2028': 5, '2027-2029': 6, '2027-2030': 7, '2028-2029': 8, '2028-2030': 9, '2029-2030': 10 };

  // startMonth (0 = január … 11 = december): ak viazanosť nezačína v januári a trvá viac rokov,
  // prvý rok sa berie len alikvotne (zvyšné mesiace) a ďalšie roky celé -> vážený priemer ročných cien
  // (napr. 1.5.2027, 2 roky: (8 × cena 2027 + 12 × cena 2028) / 20). Použité hotové priemery sa v tom prípade nepoužijú.
  function priceColumnFor(startYear, years, startMonth) {
    const endYear = startYear + years - 1;
    if (years === 1) {
      return PRICE_YEAR_COL[startYear] !== undefined
        ? { col: PRICE_YEAR_COL[startYear], label: 'rok ' + startYear } : null;
    }
    if (startMonth > 0) {
      const cols = [], w = [];
      for (let y = startYear; y <= endYear; y++) {
        if (PRICE_YEAR_COL[y] === undefined) return null;
        cols.push(PRICE_YEAR_COL[y]);
        w.push(y === startYear ? 12 - startMonth : 12);
      }
      return { col: cols, w: w, label: 'vážený Ø ' + startYear + '–' + endYear + ' (' + (12 - startMonth) + '/12 roka ' + startYear + ')' };
    }
    const key = startYear + '-' + endYear;
    if (PRICE_AVG_COL[key] !== undefined) return { col: PRICE_AVG_COL[key], label: 'Ø ' + startYear + '–' + endYear };
    // v tabuľke nie je hotový priemer (napr. 2029–2030) -> priemer z ročných stĺpcov
    const cols = [];
    for (let y = startYear; y <= endYear; y++) {
      if (PRICE_YEAR_COL[y] === undefined) return null;
      cols.push(PRICE_YEAR_COL[y]);
    }
    return { col: cols, label: 'Ø ' + startYear + '–' + endYear + ' (z ročných cien)' };
  }

  function parseSkNum(x) {
    if (x === null || x === undefined) return null;
    if (typeof x === 'number') return isFinite(x) ? x : null;
    const t = String(x).replace(/\s/g, '').replace(',', '.');
    if (t === '') return null;
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  // Načíta rozsah cez gviz pomocou <script> tagu (JSONP) – nepodlieha CORS, takže funguje
  // aj keď je súbor otvorený lokálne (file://). Vráti 2D pole hodnôt.
  function fetchSheetRange(range, formatted) {
    return new Promise((resolve, reject) => {
      const cbName = '__gvizCb' + (++window.__gvizSeq || (window.__gvizSeq = 1));
      const url = 'https://docs.google.com/spreadsheets/d/' + PRICE_SHEET_ID +
        '/gviz/tq?gid=' + PRICE_SHEET_GID + '&range=' + encodeURIComponent(range) +
        '&headers=0&tqx=responseHandler:' + cbName;
      const script = document.createElement('script');
      let done = false;
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      };
      const timer = setTimeout(() => {
        if (done) return; done = true; cleanup();
        reject(new Error('časový limit – tabuľka neodpovedala'));
      }, 15000);
      window[cbName] = json => {
        if (done) return; done = true; cleanup();
        if (!json || json.status === 'error') {
          const msg = json && json.errors && json.errors[0] && (json.errors[0].detailed_message || json.errors[0].message);
          return reject(new Error(msg || 'chyba tabuľky'));
        }
        resolve((json.table.rows || []).map(r => (r.c || []).map(c => c ? (formatted && c.f != null ? c.f : (c.v !== undefined ? c.v : null)) : null)));
      };
      script.onerror = () => {
        if (done) return; done = true; cleanup();
        reject(new Error('sieť/prístup – tabuľka sa nenačítala (skontroluj zdieľanie alebo prihlásenie do Google)'));
      };
      script.src = url;
      document.head.appendChild(script);
    });
  }

  // z riadkov (dodávatelia) vyberie najnižšiu platnú cenu v danom stĺpci
  function pickLowest(rows, col, w) {
    let best = null;
    rows.forEach(r => {
      if (!String(r[0] == null ? '' : r[0]).trim().toUpperCase().startsWith(PRICE_SUPPLIER)) return;   // len dodávateľ MVM
      let n;
      if (Array.isArray(col)) {   // priemer viacerých ročných stĺpcov – všetky musia mať cenu
        const vals = col.map(c => parseSkNum(r[c]));
        const ww = (w && w.length === vals.length) ? w : vals.map(() => 1);
        const wsum = ww.reduce((a, b) => a + b, 0);
        n = vals.every(x => x !== null && x > 0) ? Math.round(vals.reduce((a, x, i) => a + x * ww[i], 0) / wsum * 100) / 100 : null;
      } else n = parseSkNum(r[col]);
      if (n !== null && n > 0 && (best === null || n < best.price)) {
        best = { price: n, supplier: typeof r[0] === 'string' ? r[0].trim() : '' };
      }
    });
    return best;
  }

  // Posledné načítané ceny zo sheetu (používa sa pri zmene počtu rokov viazanosti)
  const PRICE_CACHE = { el: null, gas: null };

  // Zmena marže: posunie ponúkané ceny odvodené z tabuľky o rozdiel (nová − stará marža):
  //   FIX -> Ponúkaná cena (max), KOMBI -> Ponúkaná cena FIX od …; SPOT sa nemení.
  // To isté sa urobí s uloženými cenami režimov FIX / KOMBI, aby sa po prepnutí zobrazili správne.
  function setPriceMargin(m) {
    m = Math.round((isFinite(m) ? m : 0) * 100) / 100;
    const d = m - PRICE_MARGIN;
    if (!d) return;
    PRICE_MARGIN = m;
    OFFER_DATE = todayDate();
    const shiftEl = id => { const e = v(id); if (e && e.value !== '' && isFinite(parseFloat(e.value))) e.value = round1(parseFloat(e.value) + d); };
    const shiftSn = (sn, f) => { if (sn && sn[f] !== null && sn[f] !== undefined && sn[f] !== '' && isFinite(parseFloat(sn[f]))) sn[f] = String(round1(parseFloat(sn[f]) + d)); };
    ['el', 'gas'].forEach(cat => {
      if (FS_MODE[cat] === 'FIX')   shiftEl('inp_' + cat + 'Max');
      if (FS_MODE[cat] === 'KOMBI') shiftEl('inp_' + cat + 'Fix2028');
      shiftSn(MODE_MEM[cat].FIX,   'Max');
      shiftSn(MODE_MEM[cat].KOMBI, 'Fix2028');
    });
    recalc();
  }

  // Použije UŽ NAČÍTANÉ ceny zo Sheetu (PRICE_CACHE) pre aktuálny režim, počet rokov a začiatok viazanosti:
  //   FIX   -> Ponúkaná cena (max) + Predpoklad (rok začiatku)
  //   KOMBI -> Ponúkaná cena FIX od … + Predpoklad (rok začiatku FIX)
  // SPOT / vypnutá komodita / ešte nenačítané ceny -> nič sa nemení (vráti null).
  // Ručne upravený predpoklad (MANUAL_PRED) sa neprepisuje. Vráti { ok, msg }.
  function applyCachedPrices(cat) {
    const rows = PRICE_CACHE[cat];
    if (!rows || !ENERGY_ON[cat]) return null;
    const mode = FS_MODE[cat];
    if (mode === 'SPOT') return null;
    const label = cat === 'el' ? 'Elektrina' : 'Plyn';
    const years = Math.max(1, Math.round(num('inp_years_' + cat)) || 1);
    const startYear = parseDateInput('inp_start_' + cat, new Date(2027, 0, 1)).getFullYear() + (mode === 'KOMBI' ? 1 : 0);
    const startMonth = mode === 'KOMBI' ? 0 : parseDateInput('inp_start_' + cat, new Date(2027, 0, 1)).getMonth();
    const pc = priceColumnFor(startYear, years, startMonth);
    if (!pc) return { ok: false, msg: '✗ ' + label + ': pre ' + startYear + ' / ' + years + ' r. nie je v tabuľke stĺpec' };
    const best = pickLowest(rows, pc.col, pc.w);
    if (!best) return { ok: false, msg: '✗ ' + label + ': v tabuľke chýba cena (' + pc.label + ')' };
    v(mode === 'KOMBI' ? 'inp_' + cat + 'Fix2028' : 'inp_' + cat + 'Max').value = round1(best.price + PRICE_MARGIN);   // cena z tabuľky + marža
    const predId = mode === 'KOMBI' ? 'inp_' + cat + '2028' : 'inp_' + cat + '2027';
    if (!MANUAL_PRED.has(predId)) {
      const yc = priceColumnFor(startYear, 1);
      const pred = yc ? pickLowest(rows, yc.col) : null;
      if (pred) v(predId).value = round1(pred.price);
    }
    return { ok: true, msg: '✓ ' + label + ': ceny aktualizované (' + pc.label + ')' };
  }

  // Po zmene počtu rokov alebo začiatku viazanosti: znova nastaví ceny z tabuľky cien.
  async function refreshOfferPrice(cat) {
    if (!ENERGY_ON[cat] || FS_MODE[cat] === 'SPOT') return;
    const label = cat === 'el' ? 'Elektrina' : 'Plyn';
    try {
      if (!PRICE_CACHE[cat]) PRICE_CACHE[cat] = await fetchSheetRange(PRICE_RANGES[cat]);
      const r = applyCachedPrices(cat);
      recalc();
      if (r) setStatus(r.msg, r.ok);
    } catch (err) {
      console.error(err);
      setStatus('✗ ' + label + ': ceny sa nepodarilo načítať – ' + err.message, false);
    }
  }

  async function loadPrices(imp) {
    const btn = v('loadPricesBtn');
    const pre   = imp && imp.text ? imp.text + ' | ' : '';
    const preOk = !imp || imp.ok !== false;
    btn.disabled = true;
    setStatus(pre + 'Načítavam ceny…', true && preOk);
    try {
      const elRows  = await fetchSheetRange(PRICE_RANGES.el);
      const gasRows = await fetchSheetRange(PRICE_RANGES.gas);
      PRICE_CACHE.el = elRows; PRICE_CACHE.gas = gasRows;
      // uložené ceny FIX / KOMBI spred načítania sú zastarané – pri prepnutí sa dopočítajú z novej tabuľky
      ['el', 'gas'].forEach(c => { delete MODE_MEM[c].FIX; delete MODE_MEM[c].KOMBI; LAST_NONKOMBI[c] = null; });

      const applied = [];
      const problems = [];
      const skipped = [];   // komodity v režime SPOT – ceny sa nemenia

      const apply = (cat, label, rows, yearsId, startId, inputId, predId) => {
        if (!ENERGY_ON[cat]) return;
        // SPOT: ponúkaná cena aj Predpoklad 2027 sa nenačítavajú ani nedopĺňajú (ostávajú spotové, ručné).
        // Ďalšie ceny (KOMBI: FIX riadok od 2. roka a predpoklad 2. roka) sa načítavajú normálne.
        const isSpot  = FS_MODE[cat] === 'SPOT';
        const isKombi = FS_MODE[cat] === 'KOMBI';
        if (isSpot) { skipped.push(label); return; }
        if (isKombi) predId = null;   // KOMBI: 1. rok je SPOT -> Predpoklad 2027 sa nemení
        const years = Math.max(1, Math.round(num(yearsId)) || 1);
        const start = parseDateInput(startId, new Date(2027, 0, 1));
        const startYear = start.getFullYear() + (isKombi ? 1 : 0);   // KOMBI: FIX začína rok po SPOT roku

        const pc = priceColumnFor(startYear, years, isKombi ? 0 : start.getMonth());
        if (!pc) { problems.push(label + ': pre ' + startYear + ' / ' + years + ' r. nie je v tabuľke stĺpec'); return; }
        const best = pickLowest(rows, pc.col, pc.w);
        if (!best) { problems.push(label + ': v tabuľke chýba cena (' + pc.label + ')'); return; }
        const offered = round1(best.price + PRICE_MARGIN);   // cena z tabuľky + marža
        v(inputId).value = offered;
        applied.push(label + ' ' + offered.toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + (PRICE_MARGIN ? ' (vr. marže ' + PRICE_MARGIN.toLocaleString('sk-SK') + ')' : '') + ' (' + pc.label + (best.supplier ? ', ' + best.supplier : '') + ')');

        // Predpokladaná cena = cena pre rok začiatku viazanosti (jednoročný stĺpec B..E), najnižšia od dodávateľov
        if (predId && MANUAL_PRED.has(predId)) predId = null;   // ručne upravený predpoklad sa nemení
        if (predId) {
          const yc = priceColumnFor(startYear, 1);
          const pred = yc ? pickLowest(rows, yc.col) : null;
          if (pred) {
            v(predId).value = round1(pred.price);
            applied.push(label + ' predpoklad ' + startYear + ': ' + round1(pred.price).toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + (pred.supplier ? ' (' + pred.supplier + ')' : ''));
          } else {
            problems.push(label + ': v tabuľke chýba predpokladaná cena pre rok ' + startYear);
          }
        }
      };

      // Elektrina: pri FIX/SPOT sa cena vkladá do „Ponúkaná cena“ (inp_elMax).
      // Pri KOMBI sa tá istá cena zo sheetu vloží do riadku „Ponúkaná cena FIX od …“ (inp_elFix2028);
      // SPOT pole (inp_elMax) sa pri načítaní cien nikdy nemení – ostáva ručne editovateľné.
      const elKombi = ENERGY_ON.el && FS_MODE.el === 'KOMBI';
      apply('el', 'Elektrina', elRows, 'inp_years_el', 'inp_start_el', elKombi ? 'inp_elFix2028' : 'inp_elMax', 'inp_el2027');
      const gasKombi = ENERGY_ON.gas && FS_MODE.gas === 'KOMBI';
      apply('gas', 'Plyn',      gasRows, 'inp_years_gas', 'inp_start_gas', gasKombi ? 'inp_gasFix2028' : 'inp_gasMax', 'inp_gas2027');

      // KOMBI: predpoklad pre rok začiatku FIX viazanosti (min. 2028) – pole inp_el2028 / inp_gas2028
      [['Elektrina', elRows, elKombi, 'inp_start_el', 'inp_el2028'],
       ['Plyn',      gasRows, gasKombi, 'inp_start_gas', 'inp_gas2028']].forEach(([label, rows, kombi, startId, predId]) => {
        if (!kombi) return;
        if (MANUAL_PRED.has(predId)) return;   // ručne upravený predpoklad sa nemení
        const y2 = parseDateInput(startId, new Date(2027, 0, 1)).getFullYear() + 1;
        const yc2 = priceColumnFor(y2, 1);
        const pred2 = yc2 ? pickLowest(rows, yc2.col) : null;
        if (pred2) {
          v(predId).value = round1(pred2.price);
          applied.push(label + ' predpoklad ' + y2 + ': ' + round1(pred2.price).toLocaleString('sk-SK', {minimumFractionDigits:1, maximumFractionDigits:1}) + (pred2.supplier ? ' (' + pred2.supplier + ')' : ''));
        } else {
          problems.push(label + ': v tabuľke chýba predpokladaná cena pre rok ' + y2);
        }
      });

      if (applied.length) OFFER_DATE = todayDate();
      recalc();

      console.log('Načítané ceny:', applied);
      const skipTxt = skipped.length ? 'SPOT – ceny nemenené: ' + skipped.join(', ') : '';
      let msg = (applied.length ? '✓ Ceny načítané' : '') +
                (problems.length ? (applied.length ? ' | ' : '✗ ') + problems.join('; ') : '');
      if (skipTxt) msg = (msg ? msg + ' | ' : '✓ ') + skipTxt;
      setStatus(pre + msg, preOk && (applied.length > 0 || skipped.length > 0) && !problems.length);
      v('importStatus').title = (imp && imp.title ? imp.title + '\n' : '') + applied.join('\n');
    } catch (err) {
      console.error(err);
      setStatus(pre + '✗ Ceny sa nepodarilo načítať – ' + err.message, false);
    } finally {
      btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // ULOŽIŤ / NAČÍTAŤ PONUKU (JSON)
  // Ukladajú sa vstupy (úspory sa po načítaní prepočítajú). Blok „vysledok“ je len
  // informačný – pri načítaní sa ignoruje.
  // ---------------------------------------------------------------------------
  const OFFER_FORMAT = 'ponuka-cien-energii';

  function setStatus(text, ok) {
    const s = v('importStatus');
    s.textContent = text;
    s.title = text;
    s.className = 'import-status ' + (ok ? 'ok' : 'err');
  }

  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const round1 = n => Math.round((n + Number.EPSILON) * 10) / 10;

  function localIsoNow() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${toDateInputValue(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function slugify(str) {
    return String(str || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function collectState() {
    recalc();   // aktualizuje LAST_RESULT (dátum ponuky sa tým nemení)
    const r = LAST_RESULT || { el: 0, gas: 0, years: [], total: 0 };
    return {
      format: OFFER_FORMAT,
      verzia: 2,
      ulozene: localIsoNow(),
      odberatel: CLIENT_NAME,
      odberatelia: CLIENTS.map(c => ({ nazov: c.name, plny_nazov: c.full || '', ico: c.ico || '' })),
      plny_nazov: CLIENT_FULL,
      ico: CLIENT_ICO,
      odberne_miesta: { elektrina: OM_LIST.el, plyn: OM_LIST.gas },
      datum_ponuky: toDateInputValue(OFFER_DATE),
      platnost: VALIDITY_TEXT,
      marza: PRICE_MARGIN,
      elektrina: {
        zapnute: ENERGY_ON.el,
        dodavatel: SUPPLIER.el,
        sucasna_viazanost_do: BOUND_UNTIL.el,
        rezim: FS_MODE.el,
        spotreba_mwh: num('inp_consEl'),
        sucasna_cena: num('inp_curEl'),
        predpoklad_2027: num('inp_el2027'),
        ponuka_max: num('inp_elMax'),
        predpoklad_2028: num('inp_el2028'),
        ponuka_fix_2028: num('inp_elFix2028'),
        viazanost_roky: num('inp_years_el'),
        zaciatok: v('inp_start_el').value
      },
      plyn: {
        zapnute: ENERGY_ON.gas,
        dodavatel: SUPPLIER.gas,
        sucasna_viazanost_do: BOUND_UNTIL.gas,
        rezim: FS_MODE.gas,
        spotreba_mwh: num('inp_consGas'),
        sucasna_cena: num('inp_curGas'),
        predpoklad_2027: num('inp_gas2027'),
        ponuka_max: num('inp_gasMax'),
        predpoklad_2028: num('inp_gas2028'),
        ponuka_fix_2028: num('inp_gasFix2028'),
        viazanost_roky: num('inp_years_gas'),
        zaciatok: v('inp_start_gas').value
      },
      poplatky: {
        jednorazovy: num('inp_fee1'),
        mesacny: num('inp_feeM')
      },
      vysledok: {
        rocna_uspora_elektrina: round2(r.el),
        rocna_uspora_plyn: round2(r.gas),
        cista_uspora_po_rokoch: r.years.map(round2),
        celkova_uspora: round2(r.total)
      }
    };
  }

  function saveOffer() {
    try {
      const state = collectState();
      const skDate = OFFER_DATE.getDate() + '-' + (OFFER_DATE.getMonth() + 1) + '-' + OFFER_DATE.getFullYear();   // SK formát d-m-rrrr
      const fileName = 'ponuka_' + (slugify(state.odberatel) || 'klient') + '_' + skDate + '.json';
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Ponuka uložená', true);
    } catch (err) {
      setStatus('✗ Ponuku sa nepodarilo uložiť', false);
      console.error(err);
    }
  }

  // Nastaví stav z uloženého JSON. Nemení dátum ponuky (berie sa uložený).
  // Vráti zoznam polí, ktoré v súbore chýbali alebo boli neplatné.
  function applyState(s) {
    const missing = [];
    const isObj  = o => !!o && typeof o === 'object';
    const numOf  = x => (typeof x === 'number' && isFinite(x)) ? x : null;
    const isDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

    PRICE_MARGIN = numOf(s.marza) !== null ? numOf(s.marza) : 0;   // ceny v súbore už maržu obsahujú
    const mgInp = document.getElementById('cm_margin'); if (mgInp) mgInp.value = PRICE_MARGIN;
    const el   = isObj(s.elektrina) ? s.elektrina : {};
    const gas  = isObj(s.plyn)      ? s.plyn      : {};
    const fees = isObj(s.poplatky)  ? s.poplatky  : {};

    const setN = (obj, key, id, label, optional) => {
      const n = numOf(obj[key]);
      if (n === null) { if (!optional) missing.push(label); return; }
      v(id).value = Math.round(n * 10) / 10;
    };
    const setYears = (obj, id, label) => {
      const n = numOf(obj.viazanost_roky);
      if (n === null || n < 1) { missing.push(label); return; }
      v(id).value = String(Math.min(4, Math.max(1, Math.round(n))));
    };
    const setStart = (obj, id, label) => {
      if (isDate(obj.zaciatok)) v(id).value = obj.zaciatok; else missing.push(label);
    };

    MANUAL_PRED.clear();
    if (typeof s.odberatel === 'string' && s.odberatel.trim()) CLIENT_NAME = companyName(s.odberatel);
    else missing.push('odberateľ');
    CLIENTS = Array.isArray(s.odberatelia) && s.odberatelia.length > 1
      ? s.odberatelia.filter(isObj).map(c => ({ name: typeof c.nazov === 'string' ? companyName(c.nazov) : '', full: typeof c.plny_nazov === 'string' ? c.plny_nazov.trim() : '', ico: typeof c.ico === 'string' ? c.ico.trim() : '' }))
      : [];
    CLIENT_FULL = typeof s.plny_nazov === 'string' ? s.plny_nazov.trim() : '';
    CLIENT_ICO = typeof s.ico === 'string' ? s.ico.trim() : '';
    { const om = isObj(s.odberne_miesta) ? s.odberne_miesta : {};
      OM_LIST = { el: Array.isArray(om.elektrina) ? om.elektrina.map(String) : [], gas: Array.isArray(om.plyn) ? om.plyn.map(String) : [] }; }
    if (isDate(s.datum_ponuky)) OFFER_DATE = parseDateInput2(s.datum_ponuky);
    else missing.push('dátum ponuky');
    if (typeof s.platnost === 'string' && s.platnost.trim()) VALIDITY_TEXT = s.platnost.trim();

    SUPPLIER.el  = typeof el.dodavatel  === 'string' ? el.dodavatel.trim()  : '';
    SUPPLIER.gas = typeof gas.dodavatel === 'string' ? gas.dodavatel.trim() : '';
    BOUND_UNTIL.el  = cleanBound(el.sucasna_viazanost_do);
    BOUND_UNTIL.gas = cleanBound(gas.sucasna_viazanost_do);
    showSuppliers();
    showBoundUntil();

    ENERGY_ON.el  = el.zapnute  !== false;
    ENERGY_ON.gas = gas.zapnute !== false;

    setN(el, 'spotreba_mwh',    'inp_consEl',     'elektrina: spotreba');
    setN(el, 'sucasna_cena',    'inp_curEl',      'elektrina: súčasná cena');
    setN(el, 'predpoklad_2027', 'inp_el2027',     'elektrina: predpoklad');
    setN(el, 'ponuka_max',      'inp_elMax',      'elektrina: ponuka');
    setN(el, 'predpoklad_2028', 'inp_el2028',     '', true);
    setN(el, 'ponuka_fix_2028', 'inp_elFix2028',  '', true);
    setYears(el, 'inp_years_el', 'elektrina: viazanosť');
    setStart(el, 'inp_start_el', 'elektrina: začiatok');

    setN(gas, 'spotreba_mwh',    'inp_consGas', 'plyn: spotreba');
    setN(gas, 'sucasna_cena',    'inp_curGas',  'plyn: súčasná cena');
    setN(gas, 'predpoklad_2027', 'inp_gas2027', 'plyn: predpoklad');
    setN(gas, 'ponuka_max',      'inp_gasMax',  'plyn: ponuka');
    setN(gas, 'predpoklad_2028', 'inp_gas2028',    '', true);
    setN(gas, 'ponuka_fix_2028', 'inp_gasFix2028', '', true);
    setYears(gas, 'inp_years_gas', 'plyn: viazanosť');
    setStart(gas, 'inp_start_gas', 'plyn: začiatok');
    // staršie ponuky (verzia 1): pri KOMBI bol začiatok = začiatok FIX; teraz je to rok SPOT
    if ((numOf(s.verzia) || 1) < 2) {
      [[el, 'inp_start_el'], [gas, 'inp_start_gas']].forEach(([o, id]) => {
        if (String(o.rezim || '').toUpperCase() === 'KOMBI' && isDate(o.zaciatok)) {
          const yy = parseInt(o.zaciatok.slice(0, 4), 10) - 1;
          if (yy >= 2027) v(id).value = yy + o.zaciatok.slice(4);
        }
      });
    }

    setN(fees, 'jednorazovy', 'inp_fee1', 'poplatok: jednorazový');
    setN(fees, 'mesacny',     'inp_feeM', 'poplatok: mesačný');

    applyCategoryState('el');
    applyCategoryState('gas');
    const modeEl  = String(el.rezim  || 'FIX').toUpperCase();
    const modeGas = String(gas.rezim || 'FIX').toUpperCase();
    resetModeMem();
    setFixSpot('fsEl',  ['FIX', 'SPOT', 'KOMBI'].includes(modeEl)  ? modeEl  : 'FIX');
    setFixSpot('fsGas', ['FIX', 'SPOT', 'KOMBI'].includes(modeGas) ? modeGas : 'FIX');

    recalc();
    return missing;
  }

  document.getElementById('jsonFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data || data.format !== OFFER_FORMAT) {
          setStatus('✗ ' + file.name + ' – nie je uložená ponuka', false);
          return;
        }
        const missing = applyState(data);
        if (missing.length) setStatus('✗ ' + file.name + ' – chýba: ' + missing.join(', '), false);
        else setStatus('Ponuka načítaná', true);
      } catch (err) {
        setStatus('✗ Súbor sa nedá prečítať (neplatný JSON)', false);
        console.error(err);
      }
    };
    reader.onerror = () => setStatus('✗ Súbor sa nedal otvoriť', false);
    reader.readAsText(file, 'utf-8');
    this.value = '';
  });

  applyCategoryState('el');
  applyCategoryState('gas');
  recalc();

  // ───────────────────────────────────────────────────────────────────────────
  // VEĽKÝ KALENDÁR – otvorí sa po kliknutí na dátum „Začiatok viazanosti“.
  // Hodnota ostáva v pôvodnom <input type="date"> (formát rrrr-mm-dd), takže zvyšok aplikácie sa nemení.
  // ───────────────────────────────────────────────────────────────────────────
  (function () {
    const MONTHS = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];
    const DOW = ['Po','Ut','St','Št','Pi','So','Ne'];
    const p2 = n => String(n).padStart(2, '0');
    let target = null, viewY = 2027, viewM = 0, mode = 'days', yearBase = 2022;

    const ov = document.createElement('div');
    ov.className = 'cal-overlay';
    ov.innerHTML =
      '<div class="cal-card" role="dialog" aria-modal="true">' +
        '<div class="cal-title" id="calTitle">Začiatok viazanosti</div>' +
        '<div class="cal-nav">' +
          '<button type="button" class="cal-btn" data-nav="-12" title="Predchádzajúci rok">«</button>' +
          '<button type="button" class="cal-btn" data-nav="-1" title="Predchádzajúci mesiac">‹</button>' +
          '<div class="cal-month" id="calMonth"></div>' +
          '<button type="button" class="cal-btn" data-nav="1" title="Nasledujúci mesiac">›</button>' +
          '<button type="button" class="cal-btn" data-nav="12" title="Nasledujúci rok">»</button>' +
        '</div>' +
        '<div class="cal-grid" id="calGrid"></div>' +
        '<div class="cal-foot">' +
          '<button type="button" class="cal-btn" id="calToday">Dnes</button>' +
          '<button type="button" class="cal-btn" id="calClose">Zavrieť</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    function renderYears() {
      const sel = target ? parseInt((target.value || '').slice(0, 4), 10) : 0;
      const minY = target && target.min ? parseInt(target.min.slice(0, 4), 10) : 0;
      const nowY = new Date().getFullYear();
      document.getElementById('calMonth').textContent = 'Vyberte rok';
      const grid = document.getElementById('calGrid');
      grid.className = 'cal-grid years';
      let h = '';
      // ponúknuté roky: nasledujúci rok a ďalšie 3 (od dnešného roka)
      for (let y = nowY + 1; y <= nowY + 4; y++) {
        h += '<button type="button" class="cal-year' + (y === sel ? ' sel' : '') + (y === nowY ? ' cur' : '') + '" data-y="' + y + '"' + (minY && y < minY ? ' disabled' : '') + '>' + y + '</button>';
      }
      grid.innerHTML = h;
    }

    function render() {
      ov.querySelector('.cal-card').classList.toggle('yrs', mode === 'years');
      if (mode === 'years') return renderYears();
      document.getElementById('calGrid').className = 'cal-grid';
      document.getElementById('calMonth').innerHTML = MONTHS[viewM] + ' <button type="button" class="cal-yearbtn" data-year title="Vybrať iný rok">' + viewY + '</button>';
      const lead = (new Date(viewY, viewM, 1).getDay() + 6) % 7;      // pondelok = 1. stĺpec
      const days = new Date(viewY, viewM + 1, 0).getDate();
      const sel = target ? target.value : '';
      const min = target && target.min ? target.min : '';
      const today = toDateInputValue(new Date());
      let h = DOW.map(d => '<div class="cal-dow">' + d + '</div>').join('');
      for (let i = 0; i < lead; i++) h += '<div class="cal-empty"></div>';
      for (let d = 1; d <= days; d++) {
        const iso = viewY + '-' + p2(viewM + 1) + '-' + p2(d);
        const cls = 'cal-day' + (iso === sel ? ' sel' : '') + (iso === today ? ' today' : '');
        h += '<button type="button" class="' + cls + '" data-iso="' + iso + '"' + (min && iso < min ? ' disabled' : '') + '>' + d + '</button>';
      }
      document.getElementById('calGrid').innerHTML = h;
    }

    function close() { ov.classList.remove('open'); target = null; mode = 'days'; }

    function pick(iso) {
      if (!target) return;
      target.value = iso;
      target.dispatchEvent(new Event('input',  { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }

    function open(inp, title) {
      if (inp.disabled) return;
      target = inp;
      const m = /^(\d{4})-(\d{2})-/.exec(inp.value || '') || /^(\d{4})-(\d{2})-/.exec(inp.min || '') || /^(\d{4})-(\d{2})-/.exec(toDateInputValue(new Date()));
      viewY = +m[1]; viewM = +m[2] - 1; mode = 'days';
      document.getElementById('calTitle').textContent = title;
      render();
      ov.classList.add('open');
    }

    ov.addEventListener('click', function (e) {
      if (e.target === ov) return close();
      if (e.target.closest('[data-year]')) {
        mode = mode === 'years' ? 'days' : 'years';
        yearBase = viewY - 4;
        return render();
      }
      const yb = e.target.closest('.cal-year');
      if (yb && !yb.disabled) { viewY = parseInt(yb.getAttribute('data-y'), 10); mode = 'days'; return render(); }
      const nav = e.target.closest('[data-nav]');
      if (nav && mode === 'years') return;
      if (nav) {
        const t = viewY * 12 + viewM + parseInt(nav.getAttribute('data-nav'), 10);
        viewY = Math.floor(t / 12); viewM = t % 12;
        return render();
      }
      const day = e.target.closest('.cal-day');
      if (day && !day.disabled) return pick(day.getAttribute('data-iso'));
      if (e.target.id === 'calClose') return close();
      if (e.target.id === 'calToday') {
        const t = toDateInputValue(new Date());
        if (target && target.min && t < target.min) { viewY = +target.min.slice(0, 4); viewM = +target.min.slice(5, 7) - 1; return render(); }
        return pick(t);
      }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) close(); });

    [['inp_start_el', 'Začiatok viazanosti – Elektrina'], ['inp_start_gas', 'Začiatok viazanosti – Plyn']].forEach(([id, title]) => {
      const inp = document.getElementById(id);
      if (!inp) return;
      const hit = document.createElement('div');
      hit.className = 'date-hit';
      inp.parentElement.appendChild(hit);
      hit.addEventListener('click', () => open(inp, title));
    });
  })();

  // ───────────────────────────────────────────────────────────────────────────
  // PROVÍZIA – okrúhle tlačidlo „P“
  // vzorec: (Predajná cena − Base cena daného roka) / 2 × 0,3 × Objem × Podiel roka (každý rok zvlášť, záporný rozdiel sa nenuluje)
  // vyplácanie: 20 % podpis, 30 % nábeh dodávky, 50 % koniec zmluvy
  // Base: tabuľka „Ceny od dodávateľov“, dodávateľ vždy MVM.
  //   1 rok = cena pre daný rok, viac rokov = priemer ročných cien od začiatku viazanosti.
  //   SPOT = Base 4.   KOMBI = (SPOT 2027 − 4) + FIX časť (FIX − Base MVM).
  // ───────────────────────────────────────────────────────────────────────────
  const COMM_SPOT_BASE = 4;
  const COMM_SUPPLIER  = 'MVM';
  const COMM_CATS = {
    el:  { label: 'Elektrina', icon: '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2.5 4.8 13.2h6.4L10 21.5l9.2-11.3h-6.4L13 2.5z"/></svg>', consId: 'inp_consEl',  yearsId: 'inp_years_el',  startId: 'inp_start_el',  maxId: 'inp_elMax',  fixId: 'inp_elFix2028' },
    gas: { label: 'Plyn',      icon: '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.8c.8 2.7 3.6 4.2 4.4 8.2a4.6 4.6 0 0 1-9 1.2c0-1.7.9-2.8 1.8-3.6.2 1.6 1.1 2.4 2 2.4.2-3.2-.6-5.2.8-8.2z"/></svg>', consId: 'inp_consGas', yearsId: 'inp_years_gas', startId: 'inp_start_gas', maxId: 'inp_gasMax', fixId: 'inp_gasFix2028' }
  };
  const COMM = { st: {}, ov: null, token: 0, sheet: null, priceDate: null };

  // Dátum platných cien zo Sheetu – bunka D44 (zobrazí sa tak, ako je naformátovaný v tabuľke)
  async function commLoadPriceDate() {
    const rows = await fetchSheetRange('D44:D44', true);
    return commDateText(rows[0] && rows[0][0]);
  }
  function commDateText(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.getDate() + '. ' + (v.getMonth() + 1) + '. ' + v.getFullYear();
    const m = /^Date\((\d+),(\d+),(\d+)/.exec(String(v));
    if (m) return (+m[3]) + '. ' + (+m[2] + 1) + '. ' + m[1];
    return String(v).trim();
  }

  const commFmt  = (n, d) => n.toLocaleString('sk-SK', { minimumFractionDigits: d, maximumFractionDigits: d });
  const commNum  = x => { const n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const commNorm = t => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Načíta blok „Ceny od dodávateľov“ a vráti ročné ceny MVM: { el: {2027: x, ...}, gas: {...} }
  async function commLoadSupplierPrices() {
    const rows = await fetchSheetRange('A1:E70');
    if (rows[43] && !COMM.priceDate) COMM.priceDate = commDateText(rows[43][3]);
    const i0 = rows.findIndex(r => commNorm(r[0]).startsWith('ceny od dodavatel'));
    if (i0 < 0) throw new Error('v tabuľke som nenašiel blok „Ceny od dodávateľov“');
    const out = { el: null, gas: null };
    let sec = null;
    for (let i = i0 + 1; i < rows.length; i++) {
      const a = commNorm(rows[i][0]);
      if (a.startsWith('elektrin')) sec = 'el';
      else if (a.startsWith('plyn')) sec = 'gas';
      else if (sec && !out[sec] && a === commNorm(COMM_SUPPLIER)) {
        const m = {};
        [2027, 2028, 2029, 2030].forEach((y, k) => { const n = parseSkNum(rows[i][k + 1]); if (n !== null && n > 0) m[y] = n; });
        out[sec] = m;
      }
    }
    return out;
  }

  // Base = cena MVM pre rok začiatku (1 rok), pri viacerých rokoch priemer ročných cien
  function commBaseFor(map, y0, years) {
    if (!map) return { err: COMM_SUPPLIER + ' sa v tabuľke dodávateľov nenašiel' };
    const n = Math.max(1, Math.round(years) || 1);
    let sum = 0;
    for (let y = y0; y < y0 + n; y++) {
      if (map[y] == null) return { err: COMM_SUPPLIER + ' nemá v tabuľke cenu pre rok ' + y };
      sum += map[y];
    }
    return { price: round1(sum / n), label: n === 1 ? 'rok ' + y0 : 'Ø ' + y0 + '–' + (y0 + n - 1) };
  }

  function commMakeParts(cat) {
    const c = COMM_CATS[cat], mode = FS_MODE[cat];
    const years = Math.max(1, Math.round(num(c.yearsId)) || 1);
    const startD = parseDateInput(c.startId, new Date(2027, 0, 1));
    const start = startD.getFullYear();
    // alikvotná časť prvého roka: začiatok v inom mesiaci ako január → len zvyšné mesiace + ďalšie celé roky
    const offset = startD.getMonth() / 12;
    const effYears = Math.max(1 / 12, years - offset);
    const vol = num(c.consId);
    const spotInfo = 'SPOT – Base cena = ' + COMM_SPOT_BASE;
    // Predajná cena = ponúkaná cena z hlavnej stránky (FIX ceny z tabuľky už obsahujú maržu)
    const sl = id => round1(num(id));
    if (mode === 'SPOT') return [{ type: 'spot', title: '', start, startD, span: years, offset, sale: sl(c.maxId), base: COMM_SPOT_BASE, years: effYears, vol, info: spotInfo }];
    if (mode === 'KOMBI') {
      const fixStart = start + 1;
      return [
        { type: 'spot', title: 'SPOT na rok ' + start, start, startD, span: 1, offset, sale: sl(c.maxId), base: COMM_SPOT_BASE, years: Math.max(1 / 12, 1 - offset), vol, info: spotInfo },
        { type: 'fix', title: 'FIX od ' + fixStart, start: fixStart, startD: new Date(fixStart, 0, 1), span: years, offset: 0, sale: sl(c.fixId), base: null, years, vol, info: 'Načítavam Base z tabuľky…' }
      ];
    }
    return [{ type: 'fix', title: '', start, startD, span: years, offset, sale: sl(c.maxId), base: null, years: effYears, vol, info: 'Načítavam Base z tabuľky…' }];
  }

  function commRow(label, id, val, step, unit) {
    return '<div class="data-row"><span class="data-label">' + label + '</span>' +
      '<div class="inline-edit-wrap"><input type="number" inputmode="decimal" class="inline-edit-input" id="' + id + '" value="' + (val == null ? '' : val) + '" step="' + step + '">' +
      '<span class="inline-edit-unit">' + unit + '</span></div></div>';
  }

  function commCardHtml(cat) {
    const c = COMM_CATS[cat], st = COMM.st[cat];
    const colorCls = cat === 'el' ? 'el-color' : 'gas-color';
    const multi = st.parts.length > 1;
    const parts = st.parts.map((p, pi) => {
      const id = f => 'cm_' + cat + '_' + pi + '_' + f;
      return '<div class="cm-part">' +
        (p.title ? '<div class="cm-part-title">' + p.title + '</div>' : '') +
        '<div class="offer-row"><span class="offer-label">Predajná cena (ponúkaná max)</span>' +
          '<div class="inline-edit-wrap" style="margin-left:auto;"><input type="number" inputmode="decimal" step="0.1" class="inline-edit-input inline-edit-offer ' + colorCls + '" id="' + id('sale') + '" value="' + p.sale + '">' +
          '<span class="inline-edit-unit">€/MWh</span></div></div>' +
        commRow('Base cena (' + COMM_SUPPLIER + ', Ø – počíta sa po rokoch)', id('base'), p.base, '0.1', '€/MWh') +
        commRow('Počet rokov (alikvotne)', id('years'), +(+p.years).toFixed(4), 'any', 'rokov') +
        commRow('Objem', id('vol'), p.vol, '0.1', 'MWh / rok') +
        '<div class="cm-yinfo" id="' + id('yinfo') + '"></div>' +
        '<div class="cm-info" id="' + id('info') + '"></div>' +
        '<div class="cm-calc" id="' + id('calc') + '"></div>' +
        (multi ? '<div class="saving-badge"><span class="saving-text">Provízia – ' + (p.type === 'spot' ? 'SPOT' : 'FIX') + '</span><span class="saving-num" id="' + id('res') + '">–</span></div>' : '') +
      '</div>';
    }).join('');
    const modeTxt = FS_MODE[cat];
    return '<div class="ecard ecard-' + cat + (st.on ? '' : ' off') + '">' +
      '<div class="ecard-header"><div class="ecard-title"><span class="ecard-icon">' + c.icon + '</span> ' + c.label + '</div>' +
      '<span class="reg-badge ' + (st.on ? 'regulated' : 'unregulated') + '">' + (st.on ? modeTxt : 'VYPNUTÉ') + '</span></div>' +
      parts +
      '<div class="cons-highlight"><div class="cons-highlight-left"><div class="cons-highlight-label">Provízia – ' + c.label + '</div>' +
      '<div class="cons-highlight-num" id="cm_' + cat + '_total">–</div></div></div>' +
    '</div>';
  }

  const commYF = y => y.toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const commDate = d => d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  // vysvetlenie alikvotného počtu rokov pre daný diel
  function commYearsNote(p) {
    if (!p.startD || !p.offset) return '';
    const m1 = 12 - p.startD.getMonth(), n = Math.round(p.span || 1);
    const end = new Date(p.startD.getFullYear() + n - 1, 11, 31);
    return 'Viazanosť ' + commDate(p.startD) + ' – ' + commDate(end) + ': ' + m1 + '/12' +
      (n > 1 ? ' + ' + (n - 1) : '') + ' = ' + commYF(m1 / 12 + n - 1) + ' roka pre výpočet';
  }
  // Base pre konkrétny rok: SPOT = pevná Base, FIX = cena MVM pre daný rok (ručne zadaná Base platí pre všetky roky)
  function commBaseYear(cat, p, y) {
    if (p.type === 'spot') return p.base;
    const m = COMM.sheet && COMM.sheet[cat];
    if (!p.manual && m && m[y] != null) return m[y];
    return p.base;
  }
  // Rozpis po rokoch: Predajná cena (rovnaká pre všetky roky) − Base cena daného roka. Záporný rozdiel sa nenuluje.
  function commYearRows(cat, p) {
    const y0 = p.startD ? p.startD.getFullYear() : (p.start || 2027);
    const n = Math.max(1, Math.round(p.span || 1));
    const frac = []; for (let i = 0; i < n; i++) frac.push(i === 0 ? 1 - (p.offset || 0) : 1);
    const k = p.years / frac.reduce((a, b) => a + b, 0);       // zladí súčet podielov s počtom rokov z karty
    const rows = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + i, b = commBaseYear(cat, p, y);
      if (b == null) return null;
      const share = frac[i] * k, diff = p.sale - b, per = diff / 2 * 0.3;
      rows.push({ y, i, share, base: b, diff, per, tot: per * p.vol * share });
    }
    return rows;
  }
  function commCalcPart(cat, p) {
    const rows = commYearRows(cat, p);
    return rows ? { rows, val: rows.reduce((a, x) => a + x.tot, 0) } : null;
  }

  function commUpdate() {
    let grand = 0;
    Object.keys(COMM_CATS).forEach(cat => {
      const st = COMM.st[cat];
      let tot = 0, any = false;
      st.parts.forEach((p, pi) => {
        const el = f => document.getElementById('cm_' + cat + '_' + pi + '_' + f);
        const info = el('info');
        info.className = 'cm-info' + (p.err ? ' err' : '');
        info.textContent = p.err || p.info || '';
        const yi = el('yinfo'); if (yi) yi.textContent = commYearsNote(p);
        let val = null;
        const rc = commCalcPart(cat, p);
        if (rc) {
          val = rc.val; tot += val; any = true;
          el('calc').innerHTML = rc.rows.map(x => x.y + ': (' + commFmt(p.sale, 1) + ' − ' + commFmt(x.base, 1) + ') ÷ 2 × 0,3 × ' +
            commFmt(p.vol, 1) + ' MWh × ' + commYF(x.share) + ' = <b>' + commFmt(x.tot, 2) + ' €</b>').join('<br>');
        } else {
          el('calc').textContent = '';
        }
        const res = el('res'); if (res) res.textContent = val == null ? '–' : commFmt(val, 1) + ' €';
      });
      document.getElementById('cm_' + cat + '_total').textContent = any ? commFmt(tot, 1) + ' €' : '–';
      if (st.on) grand += tot;
    });
    document.getElementById('cm_grand').textContent = commFmt(grand, 1) + ' €';
    document.getElementById('cm_p1').textContent = commFmt(grand * 0.2, 1) + ' €';
    document.getElementById('cm_p2').textContent = commFmt(grand * 0.3, 1) + ' €';
    document.getElementById('cm_p3').textContent = commFmt(grand * 0.5, 1) + ' €';
    commRenderPrices();
  }

  // Prehľad cien na úplnom spodku okna: tabuľka cien (MVM) po rokoch aj priemery, ponúkané ceny s maržou
  // a Base ceny (MVM), s ktorými sa počíta provízia. Použitý stĺpec je zvýraznený.
  const CM_PCOLS = [['2027', 1], ['2028', 2], ['2029', 3], ['2030', 4],
                    ['Ø 2027–28', 5], ['Ø 2027–29', 6], ['Ø 2027–30', 7], ['Ø 2028–29', 8], ['Ø 2028–30', 9], ['Ø 2029–30', 10]];
  const CM_BASE_AVG = { 5: [2027, 2], 6: [2027, 3], 7: [2027, 4], 8: [2028, 2], 9: [2028, 3], 10: [2029, 2] };
  function commRenderPrices() {
    const box = document.getElementById('cm_ptable');
    if (!box) return;
    const mg = PRICE_MARGIN || 0;
    const fmt = n => n == null ? '–' : commFmt(n, 1);
    const td = (n, hl) => '<td>' + (hl ? '<span class="cm-hlbox">' + fmt(n) + '</span>' : fmt(n)) + '</td>';
    let html = '<div class="cm-pt-title">Prehľad cien, s ktorými sa počíta (€/MWh)</div>' +
      '<div class="cm-pt-date" style="font-size:14px;font-weight:800;margin:2px 0 8px;color:var(--orange)">Ceny platné k: ' + (COMM.priceDate || '…') + '</div>' +
      '<div class="cm-pt-wrap"><table class="cm-pt"><thead><tr><th></th>' +
      CM_PCOLS.map(c => '<th>' + c[0] + '</th>').join('') + '</tr></thead><tbody>';
    let missing = false;
    ['el', 'gas'].forEach(cat => {
      const c = COMM_CATS[cat];
      const rows = PRICE_CACHE[cat];
      const map = COMM.sheet && COMM.sheet[cat];
      const years = Math.max(1, Math.round(num(c.yearsId)) || 1);
      const startYear = parseDateInput(c.startId, new Date(2027, 0, 1)).getFullYear() + (FS_MODE[cat] === 'KOMBI' ? 1 : 0);
      const startMonthCm = FS_MODE[cat] === 'KOMBI' ? 0 : parseDateInput(c.startId, new Date(2027, 0, 1)).getMonth();
      const pc = priceColumnFor(startYear, years, startMonthCm);
      const hlCol = (ENERGY_ON[cat] && FS_MODE[cat] !== 'SPOT' && pc && !Array.isArray(pc.col)) ? pc.col : -1;
      const raw = CM_PCOLS.map(([l, col]) => { const b = rows ? pickLowest(rows, col) : null; return b ? b.price : null; });
      const withM = raw.map(x => x == null ? null : round1(x + mg));
      const base = CM_PCOLS.map(([l, col]) => {
        if (!map) return null;
        if (col <= 4) return map[2026 + col] != null ? map[2026 + col] : null;
        const a = CM_BASE_AVG[col], r = commBaseFor(map, a[0], a[1]);
        return r.err ? null : r.price;
      });
      if (!rows || !map) missing = true;
      html += '<tr class="cm-pt-cat cm-pt-' + cat + '"><td colspan="10">' + c.icon + ' ' + c.label +
              ' · režim ' + FS_MODE[cat] + (ENERGY_ON[cat] ? '' : ' · vypnuté') + '</td></tr>';
      html += '<tr class="cm-r-raw cm-r-off cm-r-' + cat + '"><th>Ponúkaná cena' + (mg ? ' (+ marža ' + commFmt(mg, 1) + ')' : '') + '</th>' +
              withM.map((x, i) => td(x, CM_PCOLS[i][1] === hlCol)).join('') + '</tr>';
      html += '<tr class="cm-r-tab"><th>Cena z tabuľky</th>' + raw.map((x, i) => td(x, false)).join('') + '</tr>';
      html += '<tr class="cm-r-base"><th>Base cena (' + COMM_SUPPLIER + ')</th>' + base.map(x => td(x, false)).join('') + '</tr>';
    });
    html += '</tbody></table></div>' +
      '<div class="cm-pt-note">Ponúkaná cena = cena z tabuľky + marža (zvýraznený stĺpec = použitý pre aktuálny začiatok a počet rokov). ' +
      'Provízia sa počíta z rozdielu predajnej a Base ceny; SPOT má Base ' + COMM_SPOT_BASE + '.' +
      (missing ? ' Niektoré ceny sa ešte načítavajú alebo sa nepodarilo načítať.' : '') + '</div>';
    box.innerHTML = html;
  }

  // dosadí Base (MVM) do FIX dielu podľa začiatku viazanosti a počtu rokov
  function commApplyBase(cat, pi) {
    const p = COMM.st[cat].parts[pi];
    const r = commBaseFor(COMM.sheet && COMM.sheet[cat], p.start, p.span || p.years);
    const inp = document.getElementById('cm_' + cat + '_' + pi + '_base');
    if (r.err) { p.base = null; p.err = r.err + ' – zadaj Base ručne.'; p.info = ''; inp.value = ''; }
    else { p.base = r.price; p.err = ''; p.info = 'Base: ' + COMM_SUPPLIER + ', ' + r.label + ((p.span || p.years) > 1 ? ' (priemer ročných cien)' : ''); inp.value = r.price; }
  }

  function commBuild() {
    if (COMM.ov) return;
    const ov = document.createElement('div');
    ov.className = 'comm-overlay';
    ov.innerHTML =
      '<div class="comm-card" role="dialog" aria-modal="true">' +
        '<div class="comm-head"><div><div class="comm-title">Provízia</div>' +
        '<div class="comm-sub">(Predajná cena − Base cena daného roka) ÷ 2 × 0,3 × Objem × Podiel roka</div></div>' +
        '<div class="cm-head-actions"><button type="button" class="pdf-export-btn" id="cm_export" title="Exportovať výpočet provízie do Excelu (xlsx)">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 2v3h3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>' +
          'Export provízie</button>' +
        '<button type="button" class="comm-x" id="cm_close" title="Zavrieť">×</button></div></div>' +
        '<div class="cm-margin"><span class="cm-margin-label">Marža</span>' +
          '<div class="inline-edit-wrap"><input type="number" inputmode="decimal" step="0.1" class="inline-edit-input" id="cm_margin" value="' + (PRICE_MARGIN || 0) + '">' +
          '<span class="inline-edit-unit">€/MWh</span></div>' +
          '<span class="cm-margin-hint">Kladné číslo sa pripočíta, záporné odpočíta od ponúkaných FIX cien (z tabuľky cien) v celej ponuke. 0 = ceny bez zmeny.</span></div>' +
        '<div class="cm-ptable" id="cm_ptable"></div>' +
        '<div class="comm-grid" id="cm_cards"></div>' +
        '<div class="hero"><div class="hero-label">Provízia spolu</div><div class="hero-num" id="cm_grand">–</div>' +
        '<div class="cm-pays">' +
          '<div><span>20 % za podpis</span><b id="cm_p1">–</b></div>' +
          '<div><span>30 % za nábeh dodávky</span><b id="cm_p2">–</b></div>' +
          '<div><span>50 % na konci zmluvy</span><b id="cm_p3">–</b></div>' +
        '</div></div>' +
      '</div>';
    document.body.appendChild(ov);
    COMM.ov = ov;

    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'cm_close') commClose();
      else if (e.target.closest && e.target.closest('#cm_export')) commExport();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) commClose(); });
    ov.addEventListener('input', e => {
      if (e.target.id === 'cm_margin') {
        // marža mení samotné ceny v ponuke (nie len výpočet provízie): posunie FIX ponúkané ceny
        // na hlavnej stránke aj v uložených režimoch, z toho sa prepočíta úspora aj provízia
        setPriceMargin(commNum(e.target.value));
        Object.keys(COMM.st).forEach(cat => COMM.st[cat].parts.forEach((p, pi) => {
          if (p.type !== 'fix') return;               // SPOT časť marža nemení
          const c = COMM_CATS[cat];
          p.sale = round1(num(FS_MODE[cat] === 'KOMBI' ? c.fixId : c.maxId));
          const inp = document.getElementById('cm_' + cat + '_' + pi + '_sale');
          if (inp) inp.value = p.sale;
        }));
        commUpdate();
        return;
      }
      const m = /^cm_(el|gas)_(\d+)_(sale|base|years|vol)$/.exec(e.target.id || '');
      if (!m) return;
      const cat = m[1], pi = +m[2], f = m[3];
      const p = COMM.st[cat].parts[pi];
      const raw = e.target.value;
      if (f === 'base') {
        p.base = raw === '' ? null : commNum(raw);
        p.manual = true; p.err = ''; p.info = 'Base zadaná ručne';
      } else {
        p[f] = commNum(raw);
        if (f === 'years') p.span = Math.max(1, Math.ceil(p.years + (p.offset || 0) - 1e-6));
        if (f === 'years' && p.type === 'fix' && !p.manual && COMM.sheet) commApplyBase(cat, pi);
      }
      commUpdate();
    });
  }

  // Export provízie → xlsx (xlsx-js-style): jeden farebný hárok, riadok = jeden rok zmluvy.
  // Stĺpce: IČO | Názov | Druh komodity (EE/ZP + OM) | Obdobie | MWh | Druh | Spolu | 20 % | 30 % | 50 %
  // Na boku sú len Base ceny MVM po rokoch pre EE a ZP, všetko ostatné sú vzorce.
  // Spolu = (Predajná − Base daného roka) ÷ 2 × 0,3 × MWh × podiel roka; záporný rozdiel sa nenuluje.
  // Údaje o firme pre export: plný názov (aj s s.r.o.), názov bez s.r.o. do mena súboru, IČO.
  function commClientInfo() {
    const clientEl = document.getElementById('clientDisp');
    const multiC = typeof CLIENTS !== 'undefined' && CLIENTS.length > 1;
    const shown = companyName(clientEl ? clientEl.textContent : '');
    return {
      client:      multiC ? CLIENTS.map(c => c.full || c.name).join(', ') : (CLIENT_FULL || shown),
      clientShort: multiC ? CLIENTS.map(c => c.name).join(', ') : shown,
      ico:         CLIENT_ICO || (multiC ? CLIENTS.map(c => c.ico).filter(Boolean).join(', ') : '')
    };
  }

  function commExport() {
    if (typeof XLSX === 'undefined') { alert('Knižnica XLSX sa nenačítala (je potrebné pripojenie na internet).'); return; }
    const cats = Object.keys(COMM_CATS).filter(cat => COMM.st[cat] && COMM.st[cat].on);
    if (!cats.length) { alert('Elektrina aj plyn sú vypnuté – nie je čo exportovať.'); return; }
    const info = commClientInfo();
    const client = info.client;            // v exporte celý názov aj s s.r.o. (z analýzy / uloženej ponuky)
    const clientShort = info.clientShort;  // do názvu súboru bez s.r.o.
    const ico = info.ico;                  // IČO z analýzy / uloženej ponuky
    const now = new Date(), today = now.toLocaleDateString('sk-SK');
    const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
    const pd = n => String(n).padStart(2, '0');
    const dmy = d => pd(d.getDate()) + '.' + pd(d.getMonth() + 1) + '.' + d.getFullYear();
    const A = XLSX.utils.encode_cell;
    const L = c => A({ r: 0, c }).replace(/\d+/, '');            // písmeno stĺpca
    const abs = (r, c) => '$' + L(c) + '$' + (r + 1);
    const EUR = '#,##0.00 "€"', P1 = '#,##0.0', P2 = '#,##0.00';
    // stĺpce
    const cI = 0, cN = 1, cC = 2, cP = 3, cV = 4, cD = 5, cS = 6, c20 = 7, c30 = 8, c50 = 9, cK = 11;
    const ws = {}; let maxc = 0, maxr = 0;
    const put = (r, c, v, z, f, st) => {
      if (v === null || v === undefined) return;
      const cell = typeof v === 'number' ? { t: 'n', v } : { t: 's', v: String(v) };
      if (z) cell.z = z; if (f) cell.f = f; if (st) cell.s = st;
      ws[A({ r, c })] = cell; maxc = Math.max(maxc, c); maxr = Math.max(maxr, r);
    };
    const thin = { style: 'thin', color: { rgb: 'FFB8C0CC' } };
    const BORDER = { top: thin, bottom: thin, left: thin, right: thin };
    const fill = rgb => ({ patternType: 'solid', fgColor: { rgb } });
    const COL = {
      el:  { row: 'FFEAF3FC', sub: 'FFBBD9F5' },
      gas: { row: 'FFFDF6D8', sub: 'FFF3DE8A' }
    };
    const stHead = rgb => ({ font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFFFF' } }, fill: fill(rgb), border: BORDER, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
    const stBody = (rgb, bold, h) => ({ font: { name: 'Arial', sz: 10, bold: !!bold }, fill: fill(rgb), border: BORDER, alignment: { horizontal: h || 'left', vertical: 'center' } });
    const code = { el: 'EE', gas: 'ZP' };
    const omOf = cat => (OM_LIST && OM_LIST[cat] && OM_LIST[cat].length) ? ' ' + OM_LIST[cat].join(', ') : '';

    // zber riadkov po komodite + Base ceny po rokoch
    const blocks = {}; const base = { el: {}, gas: {} }; const yrSet = {};
    cats.forEach(cat => {
      blocks[cat] = [];
      COMM.st[cat].parts.forEach(p => {
        const rows = commYearRows(cat, p);
        if (!rows) { blocks[cat].push({ cat, p, missing: true }); return; }
        rows.forEach(x => {
          blocks[cat].push({ cat, p, x });
          yrSet[x.y] = true;
          if (p.type !== 'spot') base[cat][x.y] = x.base;
        });
      });
    });
    const years = Object.keys(yrSet).map(Number).sort((a, b) => a - b);
    const nY = Math.max(1, years.length);
    const lastC = cK + nY;                           // K = názov komodity, ďalšie = roky
    const HR = 4;                                    // riadok hlavičky (0-based)
    const yearsRng = abs(HR, cK + 1) + ':' + abs(HR, lastC);
    const namesRng = abs(HR + 1, cK) + ':' + abs(HR + 2, cK);
    const tblRng = abs(HR + 1, cK + 1) + ':' + abs(HR + 2, lastC);

    put(0, 0, 'Rozpis provízií – ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear(), null, null,
      { font: { name: 'Arial', sz: 16, bold: true, color: { rgb: 'FF1F2A44' } } });
    put(1, 0, client + (ico ? '  ·  IČO ' + ico : ''), null, null, { font: { name: 'Arial', sz: 11, bold: true } });
    put(2, 0, 'Dátum: ' + today, null, null, { font: { name: 'Arial', sz: 10, color: { rgb: 'FF485046' } } });

    const HEAD = 'FF2B3445';
    ['IČO', 'Názov', 'Druh komodity', 'Obdobie dodávky', 'MWh', 'Druh', 'Spolu', '20 %', '30 %', '50 %'].forEach((h, i) => put(HR, i, h, null, null, stHead(HEAD)));
    put(HR, cK, 'Base MVM (€/MWh)', null, null, stHead(HEAD));
    years.forEach((y, i) => put(HR, cK + 1 + i, y, null, null, stHead(HEAD)));
    ['el', 'gas'].forEach((cat, k) => {
      put(HR + 1 + k, cK, code[cat], null, null, stBody(COL[cat].sub, true, 'center'));
      years.forEach((y, i) => put(HR + 1 + k, cK + 1 + i, base[cat][y] != null ? base[cat][y] : '', P2, null, stBody(COL[cat].row, false, 'right')));
    });

    let r = HR + 1; const subRows = []; const subVals = {}; const subRowOf = {}; const pay = {};
    cats.forEach(cat => {
      const first = r; let tot = 0; const cl = COL[cat];
      blocks[cat].forEach(Lr => {
        const e = r + 1, p = Lr.p;
        put(r, cI, ico, null, null, stBody(cl.row));
        put(r, cN, client, null, null, stBody(cl.row));
        put(r, cC, code[cat] + omOf(cat), null, null, stBody(cl.row));
        put(r, cV, p.vol, P1, null, stBody(cl.row, false, 'right'));
        put(r, cD, p.type === 'spot' ? 'SPOT' : 'Fix', null, null, stBody(cl.row, false, 'center'));
        if (Lr.missing) {
          put(r, cP, 'chýba Base – zadaj ju ručne', null, null, stBody(cl.row));
          [cS, c20, c30, c50].forEach(c => put(r, c, '', null, null, stBody(cl.row))); r++; return;
        }
        const x = Lr.x;
        const from = (x.i === 0 && p.startD) ? p.startD : new Date(x.y, 0, 1);
        put(r, cP, dmy(from) + ' – 31.12.' + x.y, null, null, stBody(cl.row));
        const m = Math.round(x.share * 12);
        const shareTxt = Math.abs(x.share * 12 - m) < 1e-6 ? (m === 12 ? '' : '*' + m + '/12') : '*' + +x.share.toFixed(6);
        const baseTxt = p.type === 'spot'
          ? String(p.base)
          : 'INDEX(' + tblRng + ',MATCH(LEFT(' + L(cC) + e + ',2),' + namesRng + ',0),MATCH(VALUE(RIGHT(' + L(cP) + e + ',4)),' + yearsRng + ',0))';
        put(r, cS, x.tot, EUR, '(' + p.sale + '-' + baseTxt + ')/2*0.3*' + L(cV) + e + shareTxt, stBody(cl.row, true, 'right'));
        put(r, c20, x.tot * 0.2, EUR, L(cS) + e + '*0.2', stBody(cl.row, false, 'right'));
        put(r, c30, x.tot * 0.3, EUR, L(cS) + e + '*0.3', stBody(cl.row, false, 'right'));
        put(r, c50, x.tot * 0.5, EUR, L(cS) + e + '*0.5', stBody(cl.row, false, 'right'));
        tot += x.tot; r++;
      });
      const last = r - 1;
      put(r, cN, 'Spolu – ' + COMM_CATS[cat].label.toLowerCase(), null, null, stBody(cl.sub, true));
      [cI, cC, cP, cV, cD].forEach(c => put(r, c, '', null, null, stBody(cl.sub, true)));
      [cS, c20, c30, c50].forEach((c, k) => put(r, c, tot * [1, 0.2, 0.3, 0.5][k], EUR,
        'SUM(' + A({ r: first, c }) + ':' + A({ r: last, c }) + ')', stBody(cl.sub, true, 'right')));
      subRows.push(r); subVals[cat] = tot; subRowOf[cat] = r;
      const fr = blocks[cat].filter(b => b.x).map(b => (b.x.i === 0 && b.p.startD) ? b.p.startD : new Date(b.x.y, 0, 1));
      const ly = blocks[cat].filter(b => b.x).map(b => b.x.y);
      if (fr.length) { pay[cat] = { from: new Date(Math.min.apply(null, fr)), to: new Date(Math.max.apply(null, ly), 11, 31) }; }
      r++;
    });
    if (subRows.length > 1) {
      const gt = cats.reduce((a, cat) => a + subVals[cat], 0);
      const stG = { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFFFF' } }, fill: fill('FF2B3445'), border: BORDER, alignment: { horizontal: 'left', vertical: 'center' } };
      put(r, cN, 'Spolu – elektrina + plyn', null, null, stG);
      [cI, cC, cP, cV, cD].forEach(c => put(r, c, '', null, null, stG));
      [cS, c20, c30, c50].forEach((c, k) => put(r, c, gt * [1, 0.2, 0.3, 0.5][k], EUR,
        subRows.map(sr => A({ r: sr, c })).join('+'), Object.assign({}, stG, { alignment: { horizontal: 'right', vertical: 'center' } })));
    }

    // ── Súhrn: spolu za komoditu + termíny výplaty (20 % pri podpise, 30 % pri nábehu dodávky, 50 % na konci obdobia) – vždy posledný deň mesiaca
    {
      r += 2;
      const serial = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 25569;
      const DATE = 'dd.mm.yyyy';
      const eom = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);       // posledný deň mesiaca, v ktorom dátum pripadá
      put(r, cN, 'Súhrn a termíny výplaty', null, null, stHead(HEAD));
      put(r, cC, 'Suma', null, null, stHead(HEAD));
      put(r, cP, 'Dátum výplaty', null, null, stHead(HEAD));
      r++;
      cats.forEach(cat => {
        const cl = COL[cat], sr = subRowOf[cat] + 1, pc = pay[cat];
        const row = (label, col, val, d, bold, note) => {
          put(r, cN, label, null, null, stBody(bold ? cl.sub : cl.row, bold));
          put(r, cC, val, EUR, L(col) + sr, stBody(bold ? cl.sub : cl.row, bold, 'right'));
          if (d) put(r, cP, serial(eom(d)), DATE, null, stBody(bold ? cl.sub : cl.row, bold, 'center'));
          else put(r, cP, note || '', null, null, stBody(bold ? cl.sub : cl.row, bold, 'center'));
          r++;
        };
        row('Spolu – ' + COMM_CATS[cat].label.toLowerCase(), cS, subVals[cat], null, true, '');
        row('20 % pri podpise zmluvy', c20, subVals[cat] * 0.2, now, false);
        row('30 % pri nábehu dodávky', c30, subVals[cat] * 0.3, pc ? pc.from : null, false, 'chýba začiatok');
        row('50 % na konci obdobia', c50, subVals[cat] * 0.5, pc ? pc.to : null, false, 'chýba koniec');
      });
    }

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxr, c: Math.max(maxc, lastC) } });
    const omW = Math.max(14, ...cats.map(cat => (code[cat] + omOf(cat)).length + 2));
    ws['!cols'] = [12, 28, omW, 26, 8, 8, 14, 12, 12, 12, 3, 18].concat(years.map(() => 10)).map(w => ({ wch: w }));
    ws['!rows'] = []; ws['!rows'][0] = { hpt: 24 }; ws['!rows'][HR] = { hpt: 28 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Provízia');
    const fname = 'Provizia' + (clientShort ? '_' + clientShort.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\-]+/g, '_') : '') + '.xlsx';
    XLSX.writeFile(wb, fname);
  }

  function commClose() { COMM.ov.classList.remove('open'); COMM.token++; }

  async function openCommission() {
    commBuild();
    const token = ++COMM.token;
    COMM.sheet = null;
    COMM.st = {};
    const mgInp = document.getElementById('cm_margin'); if (mgInp) mgInp.value = PRICE_MARGIN || 0;
    Object.keys(COMM_CATS).forEach(cat => { COMM.st[cat] = { on: !!ENERGY_ON[cat], parts: commMakeParts(cat) }; });
    document.getElementById('cm_cards').innerHTML = commCardHtml('el') + commCardHtml('gas');
    commUpdate();
    COMM.ov.classList.add('open');

    ['el', 'gas'].forEach(async cat => {
      if (PRICE_CACHE[cat]) return;
      try {
        PRICE_CACHE[cat] = await fetchSheetRange(PRICE_RANGES[cat]);
        if (token === COMM.token) commUpdate();
      } catch (e) { console.error(e); }
    });

    commLoadPriceDate().then(d => { if (d) COMM.priceDate = d; if (token === COMM.token) commUpdate(); })
      .catch(e => console.error(e));

    try {
      const data = await commLoadSupplierPrices();
      if (token !== COMM.token) return;
      COMM.sheet = data;
    } catch (err) {
      if (token !== COMM.token) return;
      Object.keys(COMM_CATS).forEach(cat => COMM.st[cat].parts.forEach(p => {
        if (p.type === 'fix') { p.err = 'Base sa nenačítala – ' + err.message + '. Zadaj ju ručne.'; p.info = ''; }
      }));
      commUpdate();
      return;
    }
    Object.keys(COMM_CATS).forEach(cat => COMM.st[cat].parts.forEach((p, pi) => {
      if (p.type === 'fix' && !p.manual) commApplyBase(cat, pi);
    }));
    commUpdate();
  }

;

(function(){
  var fmt=function(n){return n.toLocaleString('sk-SK',{minimumFractionDigits:1,maximumFractionDigits:1});};
  var val=function(id){var e=document.getElementById(id);if(!e)return NaN;return parseFloat(String(e.value).replace(',','.'));};
  var show=function(id,on){var e=document.getElementById(id);if(e)e.style.display=on?'':'none';};
  function bars(k,oldId,newId){
    var o=val(oldId), n=val(newId), ok=isFinite(o)&&isFinite(n)&&o>0&&n>=0&&n<o;
    show('pbar'+k,ok); if(!ok) return;
    var g=function(i){return document.getElementById('pbar'+k+i);};
    var cw=val('inp_cur'+k), wr=isFinite(cw)&&o>cw; g('Old').classList.toggle('worse',wr); g('OldV').classList.toggle('worse',wr);
    g('Old').style.width='100%'; g('New').style.width=Math.max(2,n/o*100)+'%';
    g('OldV').textContent=fmt(o); g('NewV').textContent=fmt(n);
    g('Pct').textContent='\u2212'+Math.round((1-n/o)*100)+' %';
  }
  function month(k,srcId,badgeId){
    var src=document.getElementById(srcId), b=document.getElementById(badgeId), m=document.getElementById('savMonth'+k);
    if(!src||!m) return;
    var t=src.textContent.split('\u20ac')[0].replace(/[^\d,.\-]/g,'').replace(',','.');
    var v=parseFloat(t), vis=!(b&&b.style.display==='none');
    if(!isFinite(v)||v<=0||!vis){m.style.display='none';return;}
    m.innerHTML='to je pribli\u017ene <b>'+fmt(v/12)+' \u20ac</b> mesa\u010dne'; m.style.display='';
  }
  function priceUp(id,curId){
    var e=document.getElementById(id); if(!e) return;
    var p=val(id), c=val(curId);
    e.classList.toggle('price-up', isFinite(p)&&isFinite(c)&&p>c);
  }
  function kbars(K,k){
    var on=(typeof FS_MODE!=='undefined')&&FS_MODE[k]==='KOMBI';
    if(on) show('pbar'+K,false);
    var g=function(i){return document.getElementById('pbar'+K+i);};
    var cur=val('inp_cur'+K), cons=val('inp_cons'+K);
    var o1=val('inp_'+k+'2027'), n1=val('inp_'+k+'Max'), o2=val('inp_'+k+'2028'), n2=val('inp_'+k+'Fix2028');
    var N=Math.max(1,Math.round(val('inp_years_'+k))||1);
    var ok=on&&[o1,n1,o2,n2].every(isFinite)&&o1>0&&o2>0;
    var w=1+N, o=(o1+o2*N)/w, n=(n1+n2*N)/w;
    ok=ok&&n<o;
    if(ok){
      var y2=document.getElementById(k+'Year2Label'), ys=y2?parseInt(y2.textContent,10):2028;
      var endY=(isFinite(ys)?ys:2028)+N-1;
      var tot=isFinite(cons)?cons*((o1-n1)+(o2-n2)*N):NaN;
      var worse=isFinite(cur)&&o>cur;
      g('KSOF').style.width='100%'; g('KSNF').style.width=Math.max(2,n/o*100)+'%';
      g('KSOV').textContent=fmt(o); g('KSNV').textContent=fmt(n);
      g('KSNP').textContent='\u2212'+Math.round((1-n/o)*100)+' %';
      [g('KSOF'),g('KSOV')].forEach(function(e){e.classList.toggle('worse',worse);});
      g('KNote').textContent='V\u00fdsledn\u00e1 \u00faspora 2027\u2013'+endY+' (priemer \u20ac/MWh)'+(isFinite(tot)?': '+Math.round(tot).toLocaleString('sk-SK')+' \u20ac spolu':'');
    }
    show('pbar'+K+'Kombi',ok);
  }
  function upd(){
    priceUp('inp_el2027','inp_curEl'); priceUp('inp_gas2027','inp_curGas'); priceUp('inp_el2028','inp_curEl'); priceUp('inp_gas2028','inp_curGas');
    month('El','elSavYear','elBottomSavingBadge'); month('Gas','gasSavYear','gasBottomSavingBadge');
  }
  ['input','change','click'].forEach(function(ev){document.addEventListener(ev,function(){setTimeout(upd,0);});});
  setInterval(upd,600); document.addEventListener('DOMContentLoaded',upd); upd();
})();

;

// ───────────────────────────────────────────────────────────────────────────
// TLAČ: texty, ktoré by sa zalamovali alebo nevošli do okna, sa zmenšia (len pre tlač, potom sa vrátia späť)
// ───────────────────────────────────────────────────────────────────────────
(function () {
  var SEL = '.data-label, .offer-label, .saving-text, .saving-num, .supplier-value, .supplier-label, .data-label-sub, ' +
            '.contract-range-label, .contract-range-value, .fee-label, .fee-value, .ycard-label, .ycard-note, .ycard-num, ' +
            '.cons-highlight-label, .cons-highlight-num, .section-title, .pbar-k, .pbar-v, .pbar-note, ' +
            '.header-validity-note, .header-date-label, .offer-date, .sav-month, .ecard-title, .reg-badge, .client-row';
  var MIN = 7, STEP = 0.5, fitted = [], busy = false;

  function tight(el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none') return false;
    var fs = parseFloat(cs.fontSize);
    var lh = parseFloat(cs.lineHeight); if (isNaN(lh)) lh = fs * 1.35;
    if (cs.display === 'inline') return el.getClientRects().length > 1;
    var r = el.getBoundingClientRect();
    if (!r.width) return false;
    return r.height > lh * 1.45 || el.scrollWidth > el.clientWidth + 1;
  }

  function fitForPrint() {
    if (busy) return; busy = true;
    document.querySelectorAll(SEL).forEach(function (el) {
      var fs = parseFloat(getComputedStyle(el).fontSize), changed = false, guard = 0;
      while (tight(el) && fs > MIN && guard++ < 60) {
        fs -= STEP; el.style.setProperty('font-size', fs + 'px', 'important'); changed = true;
      }
      if (changed) fitted.push(el);
    });
  }

  function restore() {
    fitted.forEach(function (el) { el.style.removeProperty('font-size'); });
    fitted = []; busy = false;
  }

  window.addEventListener('beforeprint', fitForPrint);
  window.addEventListener('afterprint', restore);
  if (window.matchMedia) {
    var mq = window.matchMedia('print');
    var h = function (e) { if (e.matches) fitForPrint(); else restore(); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  }
})();
