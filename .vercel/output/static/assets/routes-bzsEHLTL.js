import{n as e,r as t,t as n}from"./index-DRe27NOu.js";var r=t(e()),i=`<div id="pdfReport"></div>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <span class="client-badge">
        <span class="k" id="clientLabel">Odberateľ</span>
        <span class="name" id="clientDisp">Firma</span>
        <span class="client-ico" id="clientIco" style="display:none;"></span>
        <div class="client-multi" id="clientMulti" style="display:none;"></div>
      </span>
    </div>
    <div class="header-center">
      <div class="header-title-main">Ponuka cien energií</div>
    </div>
    <div class="header-right">
      <span class="header-date-label">Dátum ponuky</span>
      <span class="offer-date" id="offerDateDisp">17.09.2026</span>
      <span class="header-validity-note" id="headerValidityNote">Ceny sú orientačné a platné 2 dni</span>
    </div>
  </div>

  <!-- ENERGY CARDS -->
  <div class="energy-grid">

    <!-- ELEKTRINA -->
    <div class="ecard ecard-el" id="ecardEl">
      <div class="ecard-header">
        <div class="ecard-title">
          <span class="ecard-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2.5 4.8 13.2h6.4L10 21.5l9.2-11.3h-6.4L13 2.5z"/></svg></span> Elektrina
        </div>
        <div class="cat-switch on" id="catSwitch_el" onclick="toggleCategory('el')">
          <span class="track"></span>
          <span class="cat-switch-label" id="catSwitchLabel_el">ZAP</span>
        </div>
      </div>

      <div class="supplier-row">
        <div class="supplier-left">
          <span class="supplier-label">Dodávateľ</span>
          <span class="supplier-value empty" id="supplier_el">—</span>
        </div>
        <span class="data-label-sub" id="bind_el">Viazanosť do: <b>neurčitá</b></span>
      </div>

      <div class="cons-highlight">
        <div class="cons-highlight-left">
          <div class="cons-highlight-label">Ročná spotreba</div>
          <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
            <div class="cons-highlight-num" id="consElBadge">100,00 MWh</div>
            <div class="reg-badge" id="regBadgeEl"></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
          <div class="fix-spot-badge" id="fsEl">
            <span class="fs-opt active-fix" id="fsEl_fix">FIX</span>
            <span class="fs-opt" id="fsEl_spot">SPOT</span>
            <span class="fs-opt" id="fsEl_kombi">KOMBI</span>
          </div>
        </div>
      </div>

      <div class="data-row">
        <span class="data-label lbl-old">Súčasná cena (2026)</span>
        <div class="data-value-col">
          <span class="data-value" id="curElDisp">140,0</span><span class="data-unit">€/MWh</span>
        </div>
      </div>
      <div class="data-row">
        <span class="data-label lbl-old"><span id="elPredWord">Predpoklad</span> <span id="elPredTag"></span><span id="elYearLabel">2027</span></span>
        <div class="inline-edit-wrap">
          <input type="number" class="inline-edit-input" id="inp_el2027" value="165" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="offer-row">
        <span class="offer-label" id="elMaxLabel">Ponúkaná cena (max)</span>
        <div class="inline-edit-wrap" style="margin-left:auto;">
          <input type="number" class="inline-edit-input inline-edit-offer el-color" id="inp_elMax" value="135" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>

      <div class="saving-badge kombi-only" id="elKombiRowUspora" style="display:none;">
        <span class="saving-text" id="elUsporaUnit">Úspora 30 €/MWh</span>
        <span class="saving-num" id="elUsporaDisp">1 614,1 €<span class="per-year"> / rok</span></span>
      </div>

      <div class="data-row kombi-only" id="elKombiRow2028" style="display:none;">
        <span class="data-label lbl-old"><span id="elPred2Word">Predpoklad</span> <span id="elYear2Label">2028</span></span>
        <div class="inline-edit-wrap">
          <input type="number" class="inline-edit-input" id="inp_el2028" value="165" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="offer-row kombi-only" id="elKombiRowFix2028" style="display:none;">
        <span class="offer-label" id="elFixLabel">Ponúkaná cena FIX od 2028</span>
        <div class="inline-edit-wrap" style="margin-left:auto;">
          <input type="number" class="inline-edit-input inline-edit-offer el-color" id="inp_elFix2028" value="135" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="saving-badge kombi-only" id="elKombiRowUsporaFix" style="display:none;">
        <span class="saving-text" id="elUsporaFixUnit">Úspora 30 €/MWh</span>
        <span class="saving-num" id="elUsporaFixDisp">1 614,1 €<span class="per-year"> / rok</span></span>
      </div>

      <div class="saving-badge" id="elBottomSavingBadge">
        <span class="saving-text" id="elSavUnit">Úspora 35 €/MWh</span>
        <span class="saving-num" id="elSavYear">1 614,1 €<span class="per-year"> / rok</span></span>
      </div>
      <div class="sav-month" id="savMonthEl" style="display:none;"></div>
    </div>

    <!-- PLYN -->
    <div class="ecard ecard-gas" id="ecardGas">
      <div class="ecard-header">
        <div class="ecard-title">
          <span class="ecard-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.8c.8 2.7 3.6 4.2 4.4 8.2a4.6 4.6 0 0 1-9 1.2c0-1.7.9-2.8 1.8-3.6.2 1.6 1.1 2.4 2 2.4.2-3.2-.6-5.2.8-8.2z"/></svg></span> Plyn
        </div>
        <div class="cat-switch on" id="catSwitch_gas" onclick="toggleCategory('gas')">
          <span class="track"></span>
          <span class="cat-switch-label" id="catSwitchLabel_gas">ZAP</span>
        </div>
      </div>

      <div class="supplier-row">
        <div class="supplier-left">
          <span class="supplier-label">Dodávateľ</span>
          <span class="supplier-value empty" id="supplier_gas">—</span>
        </div>
        <span class="data-label-sub" id="bind_gas">Viazanosť do: <b>neurčitá</b></span>
      </div>

      <div class="cons-highlight">
        <div class="cons-highlight-left">
          <div class="cons-highlight-label">Ročná spotreba</div>
          <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
            <div class="cons-highlight-num" id="consGasBadge">100,00 MWh</div>
            <div class="reg-badge" id="regBadgeGas"></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
          <div class="fix-spot-badge" id="fsGas">
            <span class="fs-opt active-fix" id="fsGas_fix">FIX</span>
            <span class="fs-opt" id="fsGas_spot">SPOT</span>
            <span class="fs-opt" id="fsGas_kombi">KOMBI</span>
          </div>
        </div>
      </div>

      <div class="data-row">
        <span class="data-label lbl-old">Súčasná cena (2026)</span>
        <div class="data-value-col">
          <span class="data-value" id="curGasDisp">55,0</span><span class="data-unit">€/MWh</span>
        </div>
      </div>
      <div class="data-row">
        <span class="data-label lbl-old"><span id="gasPredWord">Predpoklad</span> <span id="gasPredTag"></span><span id="gasYearLabel">2027</span></span>
        <div class="inline-edit-wrap">
          <input type="number" class="inline-edit-input" id="inp_gas2027" value="60" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="offer-row">
        <span class="offer-label" id="gasMaxLabel">Ponúkaná cena (max)</span>
        <div class="inline-edit-wrap" style="margin-left:auto;">
          <input type="number" class="inline-edit-input inline-edit-offer gas-color" id="inp_gasMax" value="45" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>


      <div class="saving-badge kombi-only" id="gasKombiRowUspora" style="display:none;">
        <span class="saving-text" id="gasUsporaUnit">Úspora 20,0 €/MWh</span>
        <span class="saving-num" id="gasUsporaDisp">897,9 €<span class="per-year"> / rok</span></span>
      </div>

      <div class="data-row kombi-only" id="gasKombiRow2028" style="display:none;">
        <span class="data-label lbl-old"><span id="gasPred2Word">Predpoklad</span> <span id="gasYear2Label">2028</span></span>
        <div class="inline-edit-wrap">
          <input type="number" class="inline-edit-input" id="inp_gas2028" value="60" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="offer-row kombi-only" id="gasKombiRowFix2028" style="display:none;">
        <span class="offer-label" id="gasFixLabel">Ponúkaná cena FIX od 2028</span>
        <div class="inline-edit-wrap" style="margin-left:auto;">
          <input type="number" class="inline-edit-input inline-edit-offer gas-color" id="inp_gasFix2028" value="45" step="0.1" min="0">
          <span class="inline-edit-unit">€/MWh</span>
        </div>
      </div>
      <div class="saving-badge kombi-only" id="gasKombiRowUsporaFix" style="display:none;">
        <span class="saving-text" id="gasUsporaFixUnit">Úspora 20,0 €/MWh</span>
        <span class="saving-num" id="gasUsporaFixDisp">897,9 €<span class="per-year"> / rok</span></span>
      </div>

      <div class="saving-badge" id="gasBottomSavingBadge">
        <span class="saving-text" id="gasSavUnit">Úspora 20,5 €/MWh</span>
        <span class="saving-num" id="gasSavYear">897,9 €<span class="per-year"> / rok</span></span>
      </div>
      <div class="sav-month" id="savMonthGas" style="display:none;"></div>
    </div>

  </div>

  <!-- HIDDEN INPUTS -->
  <div style="display:none">
    <input type="number" id="inp_consEl"  value="100">
    <input type="number" id="inp_consGas" value="100">
    <input type="number" id="inp_curEl"   value="140">
    <input type="number" id="inp_curGas"  value="55">
  </div>

  <!-- STAT ROW -->
  <div class="stat-row">

    <div class="input-section contract-el" id="contractPanel_el">
      <div class="section-title">Viazanosť</div>
      <div class="input-grid">
        <div class="input-field editable">
          <label>Dĺžka</label>
          <div class="input-wrap">
            <span class="input-unit">Počet rokov</span>
            <select id="inp_years_el">
              <option value="1">1</option>
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
        <div class="input-field editable">
          <label>Začiatok viazanosti</label>
          <div class="input-wrap">
            <input type="date" id="inp_start_el" value="2027-01-01">
          </div>
        </div>
      </div>
      <div class="contract-range-row">
        <span class="contract-range-label">Doba viazanosti</span>
        <span class="contract-range-value" id="viazanostDisp_el">1.1.2027 – 31.12.2028</span>
      </div>
    </div>

    <div class="fees-section">
      <div class="section-title">Poplatky za službu</div>

      <div class="fee-row">
        <span class="fee-label">Jednorazový administratívny poplatok</span>
        <div class="fee-input-wrap">
          <input type="number" id="inp_fee1" value="0" step="1" min="0">
          <span class="fee-unit">€</span>
        </div>
      </div>

      <div class="fee-row">
        <span class="fee-label">Mesačný poplatok</span>
        <div class="fee-input-wrap">
          <input type="number" id="inp_feeM" value="0" step="1" min="0">
          <span class="fee-unit">€</span>
        </div>
      </div>

      <div class="fee-row computed">
        <span class="fee-label">Ročný poplatok (12 mes.)</span>
        <span class="fee-value" id="feeYearly">540,0 €</span>
      </div>
    </div>

    <div class="input-section contract-gas" id="contractPanel_gas">
      <div class="section-title">Viazanosť</div>
      <div class="input-grid">
        <div class="input-field editable">
          <label>Dĺžka</label>
          <div class="input-wrap">
            <span class="input-unit">Počet rokov</span>
            <select id="inp_years_gas">
              <option value="1">1</option>
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
        <div class="input-field editable">
          <label>Začiatok viazanosti</label>
          <div class="input-wrap">
            <input type="date" id="inp_start_gas" value="2027-01-01">
          </div>
        </div>
      </div>
      <div class="contract-range-row">
        <span class="contract-range-label">Doba viazanosti</span>
        <span class="contract-range-value" id="viazanostDisp_gas">1.1.2027 – 31.12.2028</span>
      </div>
    </div>

  </div>

  <!-- YEAR CARDS -->
  <div class="year-grid" id="yearGrid"></div>

  <!-- BOTTOM BAR: import | PDF export (center) | theme toggle -->
  <div class="bottom-bar">
    <div class="import-tucked">
      <input type="file" id="xlsxFileInput" multiple accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel">
      <button class="import-link" title="Možno vybrať viac súborov naraz (Ctrl / Shift) – spotreby sa sčítajú, ceny sa spriemerujú váhou spotreby" onclick="document.getElementById('xlsxFileInput').click()">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12v2h12v-2M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Načítať dáta z Excelu
      </button>
      <span class="import-status" id="importStatus"></span>
    </div>

    <div class="pdf-export-center">
      <input type="file" id="jsonFileInput" accept=".json,application/json">
      <button class="pdf-export-btn" id="loadPricesBtn" onclick="loadPrices()" title="Načíta aktuálne ceny z Google tabuľky a vloží ich do polí Ponúkaná cena a Predpoklad">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Načítať ceny
      </button>
      <button class="pdf-export-btn" id="loadOfferBtn" onclick="document.getElementById('jsonFileInput').click()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        Načítať ponuku
      </button>
      <button class="pdf-export-btn" id="saveOfferBtn" onclick="saveOffer()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2h8l2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M5.5 2v3h4.5V2M5.5 14v-4h5v4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        Uložiť ponuku
      </button>
      <button class="pdf-export-btn" id="pdfExportBtn" onclick="exportToPdf()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M9 2v3h3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        Export do PDF
      </button>
      <button class="pdf-export-btn round-p" id="commBtn" onclick="openCommission()" title="Kalkulačka provízie">P</button>
    </div>

    </div>

</div>
`,a=n(),o=[`https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js`,`https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`,`https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`];function s(e){return new Promise((t,n)=>{if(document.querySelector(`script[src="${e}"]`)){t();return}let r=document.createElement(`script`);r.src=e,r.async=!1,r.onload=()=>t(),r.onerror=()=>n(Error(e)),document.body.appendChild(r)})}function c(){return(0,r.useEffect)(()=>{let e=window;e.__offerBoot||(e.__offerBoot=!0,(async()=>{for(let e of o)try{await s(e)}catch(e){console.error(e)}try{await s(`/offer.js`)}catch(e){console.error(e)}})())},[]),(0,a.jsx)(`div`,{className:`offer-root`,dangerouslySetInnerHTML:{__html:i}})}export{c as component};