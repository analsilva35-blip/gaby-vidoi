/**
 * ============================================================================
 * PROJETO ACADÊMICO: "BARRELROAD"
 * Calculadora de Custos de Viagem, Provas e Premiações nos Três Tambores
 * 
 * ARQUITETURA:
 * - Padrão Modular (State, Financial Calculator, Storage, UI Renderer)
 * - Cálculos Financeiros Dinâmicos em Tempo Real (Prévia e Balanço Global)
 * - Persistência Local via Web Storage API (localStorage)
 * - Tratamento Robusto de Eventos com Delegação no DOM
 * - Exportação para CSV e Relatórios de Impressão
 * - Formatação Monetária Oficial Brasileira (BRL / Real)
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONSTANTES E CONFIGURAÇÕES
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'BARRELROAD_RACES_DATA_V1';

  // Dataset inicial realista do circuito nacional de Três Tambores (Seed Data)
  // Apresenta ao avaliador os 3 estados visuais de imediato:
  // 🟢 Lucro, 🔴 Prejuízo e ⚪ Neutro/Empatado.
  const DEFAULT_SAMPLE_RACES = [
    {
      id: 'race-sample-1',
      name: 'Grand Prix Haras Raphaela',
      location: 'Haras Raphaela - Tietê/SP',
      date: '2026-03-15',
      costEntry: 1200.00,
      costStall: 450.00,
      costTravel: 800.00,
      prizeWon: 5000.00,
      notes: 'Animal: Zorrero Dash (Aberta Jr) - 2º Lugar no pódio!',
      createdAt: '2026-03-16T10:00:00.000Z'
    },
    {
      id: 'race-sample-2',
      name: 'Copa Haras Rosa Mística',
      location: 'Haras Rosa Mística - Porto Feliz/SP',
      date: '2026-04-20',
      costEntry: 900.00,
      costStall: 380.00,
      costTravel: 540.00,
      prizeWon: 0.00,
      notes: 'Animal: Victory Fly Fame (Feminino) - Derrubou o 2º tambor.',
      createdAt: '2026-04-21T18:30:00.000Z'
    },
    {
      id: 'race-sample-3',
      name: 'Super Semana NBHA Brazil',
      location: 'Parque Fernando Cruz Pimentel - Avaré/SP',
      date: '2026-06-12',
      costEntry: 1000.00,
      costStall: 400.00,
      costTravel: 700.00,
      prizeWon: 2100.00,
      notes: 'Animal: Zorrero Dash - Premiação cobriu exatamente os custos.',
      createdAt: '2026-06-13T14:15:00.000Z'
    }
  ];

  // --------------------------------------------------------------------------
  // 2. ESTADO GLOBAL DA APLICAÇÃO (STATE MANAGEMENT)
  // --------------------------------------------------------------------------
  const state = {
    races: [],
    currentFilter: 'all', // 'all' | 'profit' | 'loss' | 'neutral'
    searchQuery: '',
    editingRaceId: null
  };

  // --------------------------------------------------------------------------
  // 3. REFERÊNCIAS AO DOM (CACHE)
  // --------------------------------------------------------------------------
  const DOM = {
    currentYear: document.getElementById('currentYear'),
    btnPrintReport: document.getElementById('btnPrintReport'),
    btnExportCsv: document.getElementById('btnExportCsv'),

    // Cards do Dashboard
    statTotalExpense: document.getElementById('statTotalExpense'),
    statExpenseBreakdown: document.getElementById('statExpenseBreakdown'),
    statTotalPrize: document.getElementById('statTotalPrize'),
    statPrizeCount: document.getElementById('statPrizeCount'),
    cardBalance: document.getElementById('cardBalance'),
    statNetBalance: document.getElementById('statNetBalance'),
    balanceTag: document.getElementById('balanceTag'),
    balanceIcon: document.getElementById('balanceIcon'),
    statTotalRaces: document.getElementById('statTotalRaces'),
    statProfitableRaces: document.getElementById('statProfitableRaces'),
    statLossRaces: document.getElementById('statLossRaces'),
    statRoiMeta: document.getElementById('statRoiMeta'),

    // Filtros e Busca
    filterChipsGroup: document.querySelector('.filter-chips-group'),
    chips: document.querySelectorAll('.chip'),
    countAll: document.getElementById('countAll'),
    countProfit: document.getElementById('countProfit'),
    countLoss: document.getElementById('countLoss'),
    countNeutral: document.getElementById('countNeutral'),
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),

    // Formulário
    btnToggleForm: document.getElementById('btnToggleForm'),
    btnToggleText: document.getElementById('btnToggleText'),
    formSection: document.getElementById('formSection'),
    formHeading: document.getElementById('formHeading'),
    btnCloseForm: document.getElementById('btnCloseForm'),
    btnCancelForm: document.getElementById('btnCancelForm'),
    raceForm: document.getElementById('raceForm'),
    btnSubmitText: document.getElementById('btnSubmitText'),

    // Campos do Formulário
    raceId: document.getElementById('raceId'),
    raceName: document.getElementById('raceName'),
    raceLocation: document.getElementById('raceLocation'),
    raceDate: document.getElementById('raceDate'),
    costEntry: document.getElementById('costEntry'),
    costStall: document.getElementById('costStall'),
    costTravel: document.getElementById('costTravel'),
    prizeWon: document.getElementById('prizeWon'),
    raceNotes: document.getElementById('raceNotes'),

    // Elementos de Erro
    errorRaceName: document.getElementById('errorRaceName'),
    errorRaceLocation: document.getElementById('errorRaceLocation'),
    errorRaceDate: document.getElementById('errorRaceDate'),
    errorCostEntry: document.getElementById('errorCostEntry'),
    errorCostStall: document.getElementById('errorCostStall'),
    errorCostTravel: document.getElementById('errorCostTravel'),
    errorPrizeWon: document.getElementById('errorPrizeWon'),

    // Prévia em tempo real
    previewTotalCost: document.getElementById('previewTotalCost'),
    previewPrize: document.getElementById('previewPrize'),
    previewBalance: document.getElementById('previewBalance'),

    // Listagem
    racesContainer: document.getElementById('racesContainer'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyDescription: document.getElementById('emptyDescription'),
    btnEmptyAdd: document.getElementById('btnEmptyAdd'),

    // Rodapé e Toasts
    btnResetData: document.getElementById('btnResetData'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --------------------------------------------------------------------------
  // 4. FORMATADORES E FUNÇÕES UTILITÁRIAS (HELPERS)
  // --------------------------------------------------------------------------

  function formatCurrency(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(num);
  }

  function formatDateBR(dateString) {
    if (!dateString) return 'Data não informada';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  }

  function generateId() {
    return 'race_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sintetizador de áudio via Web Audio API nativa
   */
  function playAudioFeedback(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'profit') {
        // Acorde alegre de vitória / lucro
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Tom suave de confirmação
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Ignora silenciosamente se o navegador bloquear autoplay de áudio
    }
  }

  // --------------------------------------------------------------------------
  // 5. MOTOR DE CÁLCULO FINANCEIRO (FINANCIAL ENGINE)
  // --------------------------------------------------------------------------
  const FinancialCalculator = {
    /**
     * Calcula o custo total e balanço líquido de uma etapa individual.
     * Custo Total = Inscrição + Baia + Viagem
     * Saldo Líquido = Premiação Ganha - Custo Total
     */
    computeRace(race) {
      const entry = Number(race.costEntry) || 0;
      const stall = Number(race.costStall) || 0;
      const travel = Number(race.costTravel) || 0;
      const prize = Number(race.prizeWon) || 0;

      const totalCost = entry + stall + travel;
      const netBalance = prize - totalCost;

      let status = 'neutral';
      if (netBalance > 0) {
        status = 'profit';
      } else if (netBalance < 0) {
        status = 'loss';
      }

      return {
        entry,
        stall,
        travel,
        prize,
        totalCost,
        netBalance,
        status
      };
    },

    /**
     * Calcula os totais acumulados de todas as provas para o Dashboard.
     */
    computeGlobal(racesList) {
      let totalExpense = 0;
      let totalPrize = 0;
      let profitCount = 0;
      let lossCount = 0;
      let neutralCount = 0;
      let prizesWithEarnings = 0;

      racesList.forEach(race => {
        const result = this.computeRace(race);
        totalExpense += result.totalCost;
        totalPrize += result.prize;

        if (result.prize > 0) {
          prizesWithEarnings++;
        }

        if (result.status === 'profit') profitCount++;
        else if (result.status === 'loss') lossCount++;
        else neutralCount++;
      });

      const netBalance = totalPrize - totalExpense;
      const roi = totalExpense > 0 ? ((netBalance / totalExpense) * 100) : 0;

      return {
        totalExpense,
        totalPrize,
        netBalance,
        profitCount,
        lossCount,
        neutralCount,
        prizesWithEarnings,
        totalRaces: racesList.length,
        roi
      };
    }
  };

  // --------------------------------------------------------------------------
  // 6. SISTEMA DE PERSISTÊNCIA (LOCALSTORAGE ENGINE)
  // --------------------------------------------------------------------------
  const StorageService = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this.save(DEFAULT_SAMPLE_RACES);
          return [...DEFAULT_SAMPLE_RACES];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('Erro ao ler localStorage:', err);
        return [...DEFAULT_SAMPLE_RACES];
      }
    },

    save(list) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return true;
      } catch (err) {
        console.error('Erro ao salvar no localStorage:', err);
        ToastService.show('Erro de Armazenamento', 'Não foi possível salvar os dados localmente.', 'danger');
        return false;
      }
    },

    reset() {
      this.save(DEFAULT_SAMPLE_RACES);
      state.races = [...DEFAULT_SAMPLE_RACES];
      renderAll();
      ToastService.show('Dados Restaurados', 'As etapas de exemplo foram restauradas com sucesso!', 'info');
    }
  };

  // --------------------------------------------------------------------------
  // 7. SISTEMA DE NOTIFICAÇÕES (TOAST FEEDBACK)
  // --------------------------------------------------------------------------
  const ToastService = {
    show(title, message, type = 'info', duration = 3500) {
      const icons = {
        success: '🏆',
        danger: '⚠️',
        info: '🐎'
      };

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.setAttribute('role', 'alert');

      toast.innerHTML = `
        <span class="toast__icon" aria-hidden="true">${icons[type] || 'ℹ️'}</span>
        <div class="toast__body">
          <h4 class="toast__title">${escapeHtml(title)}</h4>
          <p class="toast__message">${escapeHtml(message)}</p>
        </div>
      `;

      DOM.toastContainer.appendChild(toast);

      if (type === 'success') {
        playAudioFeedback('profit');
      } else {
        playAudioFeedback('info');
      }

      setTimeout(() => {
        toast.classList.add('toast--fadeout');
        toast.addEventListener('transitionend', () => {
          if (toast.parentNode) toast.remove();
        });
      }, duration);
    }
  };

  // --------------------------------------------------------------------------
  // 8. RENDERIZAÇÃO DA INTERFACE (UI ENGINE)
  // --------------------------------------------------------------------------
  function updateDashboard() {
    const metrics = FinancialCalculator.computeGlobal(state.races);

    DOM.statTotalExpense.textContent = formatCurrency(metrics.totalExpense);
    DOM.statTotalPrize.textContent = formatCurrency(metrics.totalPrize);
    DOM.statPrizeCount.textContent = `${metrics.prizesWithEarnings} etapa(s) com premiação`;
    DOM.statNetBalance.textContent = formatCurrency(metrics.netBalance);

    if (metrics.netBalance > 0) {
      DOM.statNetBalance.className = 'dash-card__value text-prize';
      DOM.balanceTag.className = 'balance-tag balance-tag--profit';
      DOM.balanceTag.textContent = '🟢 Temporada no Lucro';
      DOM.balanceIcon.textContent = '📈';
    } else if (metrics.netBalance < 0) {
      DOM.statNetBalance.className = 'dash-card__value text-expense';
      DOM.balanceTag.className = 'balance-tag balance-tag--loss';
      DOM.balanceTag.textContent = '🔴 Temporada no Prejuízo';
      DOM.balanceIcon.textContent = '📉';
    } else {
      DOM.statNetBalance.className = 'dash-card__value';
      DOM.balanceTag.className = 'balance-tag balance-tag--neutral';
      DOM.balanceTag.textContent = '⚪ Temporada Equilibrada';
      DOM.balanceIcon.textContent = '⚖️';
    }

    DOM.statTotalRaces.textContent = metrics.totalRaces;
    DOM.statProfitableRaces.textContent = metrics.profitCount;
    DOM.statLossRaces.textContent = metrics.lossCount;
    DOM.statRoiMeta.textContent = `Retorno sobre Investimento (ROI): ${metrics.roi.toFixed(1)}%`;

    DOM.countAll.textContent = metrics.totalRaces;
    DOM.countProfit.textContent = metrics.profitCount;
    DOM.countLoss.textContent = metrics.lossCount;
    DOM.countNeutral.textContent = metrics.neutralCount;
  }

  function getFilteredRaces() {
    return state.races.filter(race => {
      const calc = FinancialCalculator.computeRace(race);

      if (state.currentFilter === 'profit' && calc.status !== 'profit') return false;
      if (state.currentFilter === 'loss' && calc.status !== 'loss') return false;
      if (state.currentFilter === 'neutral' && calc.status !== 'neutral') return false;

      if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase().trim();
        const matchName = race.name.toLowerCase().includes(query);
        const matchLoc = race.location.toLowerCase().includes(query);
        const matchNotes = race.notes ? race.notes.toLowerCase().includes(query) : false;

        if (!matchName && !matchLoc && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }

  function renderRacesList() {
    const list = getFilteredRaces();
    DOM.racesContainer.innerHTML = '';

    if (list.length === 0) {
      DOM.emptyState.classList.remove('hidden');

      if (state.searchQuery.trim() !== '') {
        DOM.emptyTitle.textContent = 'Nenhuma etapa encontrada';
        DOM.emptyDescription.textContent = `Nenhum resultado corresponde à busca por "${state.searchQuery}". Tente outros termos.`;
      } else if (state.currentFilter === 'profit') {
        DOM.emptyTitle.textContent = 'Nenhuma prova com lucro ainda';
        DOM.emptyDescription.textContent = 'Nenhuma das etapas disputadas obteve premiação superior aos custos totais.';
      } else if (state.currentFilter === 'loss') {
        DOM.emptyTitle.textContent = 'Nenhuma prova no prejuízo! 🎉';
        DOM.emptyDescription.textContent = 'Excelente resultado! Nenhuma etapa apresentou custos maiores que as premiações.';
      } else {
        DOM.emptyTitle.textContent = 'Nenhuma etapa registrada';
        DOM.emptyDescription.textContent = 'Clique no botão acima para lançar sua primeira prova da temporada de Três Tambores.';
      }
      return;
    }

    DOM.emptyState.classList.add('hidden');
    const fragment = document.createDocumentFragment();

    list.forEach(race => {
      const card = createRaceCardElement(race);
      fragment.appendChild(card);
    });

    DOM.racesContainer.appendChild(fragment);
  }

  function createRaceCardElement(race) {
    const calc = FinancialCalculator.computeRace(race);
    const card = document.createElement('article');
    card.className = `race-card status-${calc.status}`;
    card.setAttribute('data-id', race.id);

    let statusBadgeText = '';
    let statusBadgeClass = '';
    let resultBoxClass = '';
    let balanceDisplaySign = '';

    if (calc.status === 'profit') {
      statusBadgeText = '🟢 Lucro';
      statusBadgeClass = 'badge-status--profit';
      resultBoxClass = 'result-profit';
      balanceDisplaySign = '+';
    } else if (calc.status === 'loss') {
      statusBadgeText = '🔴 Prejuízo';
      statusBadgeClass = 'badge-status--loss';
      resultBoxClass = 'result-loss';
      balanceDisplaySign = '';
    } else {
      statusBadgeText = '⚪ Empatada / Neutro';
      statusBadgeClass = 'badge-status--neutral';
      resultBoxClass = 'result-neutral';
      balanceDisplaySign = '';
    }

    card.innerHTML = `
      <div>
        <div class="race-card__header">
          <div>
            <h3 class="race-card__title">${escapeHtml(race.name)}</h3>
            <p class="race-card__location">📍 ${escapeHtml(race.location)}</p>
          </div>
          <span class="badge-status ${statusBadgeClass}">${statusBadgeText}</span>
        </div>

        <div class="race-card__meta-bar">
          <span>📅 Data: <strong>${formatDateBR(race.date)}</strong></span>
          <span>🐎 Três Tambores</span>
        </div>

        <div class="race-card__costs-box">
          <div class="cost-row">
            <span class="cost-label">Inscrições:</span>
            <span class="cost-value">${formatCurrency(calc.entry)}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Baia & Trato:</span>
            <span class="cost-value">${formatCurrency(calc.stall)}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Viagem / Combustível:</span>
            <span class="cost-value">${formatCurrency(calc.travel)}</span>
          </div>
          <div class="cost-row cost-row--total">
            <span class="cost-label">Custo Total da Etapa:</span>
            <span class="cost-value">${formatCurrency(calc.totalCost)}</span>
          </div>
        </div>

        <div class="race-card__result-box ${resultBoxClass}">
          <div class="result-col">
            <span class="result-label">Premiação Conquistada:</span>
            <strong class="result-val text-prize">${formatCurrency(calc.prize)}</strong>
          </div>
          <div class="result-col" style="text-align: right;">
            <span class="result-label">Resultado Final:</span>
            <strong class="result-val ${calc.status === 'profit' ? 'text-prize' : (calc.status === 'loss' ? 'text-expense' : '')}">
              ${balanceDisplaySign}${formatCurrency(calc.netBalance)}
            </strong>
          </div>
        </div>

        ${race.notes ? `<div class="race-card__notes" title="Anotações da Prova">📝 ${escapeHtml(race.notes)}</div>` : ''}
      </div>

      <div class="race-card__actions">
        <button type="button" class="btn-card-action js-btn-edit" data-id="${race.id}" title="Editar informações desta etapa">
          ✏️ Editar
        </button>
        <button type="button" class="btn-card-action btn-card-action--delete js-btn-delete" data-id="${race.id}" title="Excluir esta etapa">
          🗑️ Excluir
        </button>
      </div>
    `;

    return card;
  }

  function renderAll() {
    updateDashboard();
    renderRacesList();
  }

  // --------------------------------------------------------------------------
  // 9. PRÉVIA EM TEMPO REAL NO FORMULÁRIO
  // --------------------------------------------------------------------------
  function updateLiveFormPreview() {
    const entry = Number(DOM.costEntry.value) || 0;
    const stall = Number(DOM.costStall.value) || 0;
    const travel = Number(DOM.costTravel.value) || 0;
    const prize = Number(DOM.prizeWon.value) || 0;

    const totalCost = entry + stall + travel;
    const netBalance = prize - totalCost;

    DOM.previewTotalCost.textContent = formatCurrency(totalCost);
    DOM.previewPrize.textContent = formatCurrency(prize);

    if (netBalance > 0) {
      DOM.previewBalance.textContent = `+${formatCurrency(netBalance)} (🟢 Lucro)`;
      DOM.previewBalance.className = 'preview-val text-prize';
    } else if (netBalance < 0) {
      DOM.previewBalance.textContent = `${formatCurrency(netBalance)} (🔴 Prejuízo)`;
      DOM.previewBalance.className = 'preview-val text-expense';
    } else {
      DOM.previewBalance.textContent = `${formatCurrency(netBalance)} (⚪ Neutro)`;
      DOM.previewBalance.className = 'preview-val';
    }
  }

  // --------------------------------------------------------------------------
  // 10. VALIDAÇÃO E GESTÃO DO FORMULÁRIO
  // --------------------------------------------------------------------------
  function clearFormErrors() {
    DOM.errorRaceName.textContent = '';
    DOM.errorRaceLocation.textContent = '';
    DOM.errorRaceDate.textContent = '';
    DOM.errorCostEntry.textContent = '';
    DOM.errorCostStall.textContent = '';
    DOM.errorCostTravel.textContent = '';
    DOM.errorPrizeWon.textContent = '';

    DOM.raceName.classList.remove('is-invalid');
    DOM.raceLocation.classList.remove('is-invalid');
    DOM.raceDate.classList.remove('is-invalid');
    DOM.costEntry.classList.remove('is-invalid');
    DOM.costStall.classList.remove('is-invalid');
    DOM.costTravel.classList.remove('is-invalid');
    DOM.prizeWon.classList.remove('is-invalid');
  }

  function validateRaceForm() {
    clearFormErrors();
    let isValid = true;

    const nameVal = DOM.raceName.value.trim();
    if (!nameVal) {
      DOM.errorRaceName.textContent = 'Informe o nome da prova ou campeonato.';
      DOM.raceName.classList.add('is-invalid');
      isValid = false;
    } else if (nameVal.length < 2) {
      DOM.errorRaceName.textContent = 'O nome deve ter no mínimo 2 caracteres.';
      DOM.raceName.classList.add('is-invalid');
      isValid = false;
    }

    const locVal = DOM.raceLocation.value.trim();
    if (!locVal) {
      DOM.errorRaceLocation.textContent = 'Informe o Haras ou a cidade/UF da prova.';
      DOM.raceLocation.classList.add('is-invalid');
      isValid = false;
    }

    const dateVal = DOM.raceDate.value;
    if (!dateVal) {
      DOM.errorRaceDate.textContent = 'Selecione a data em que a prova foi ou será realizada.';
      DOM.raceDate.classList.add('is-invalid');
      isValid = false;
    }

    const entryVal = DOM.costEntry.value.trim();
    const entryNum = Number(entryVal);
    if (entryVal === '' || isNaN(entryNum)) {
      DOM.errorCostEntry.textContent = 'Informe o valor total das inscrições (mínimo R$ 0,00).';
      DOM.costEntry.classList.add('is-invalid');
      isValid = false;
    } else if (entryNum < 0) {
      DOM.errorCostEntry.textContent = 'O valor da inscrição não pode ser negativo.';
      DOM.costEntry.classList.add('is-invalid');
      isValid = false;
    }

    const stallVal = DOM.costStall.value.trim();
    if (stallVal !== '') {
      const stallNum = Number(stallVal);
      if (isNaN(stallNum) || stallNum < 0) {
        DOM.errorCostStall.textContent = 'Insira um valor numérico válido maior ou igual a zero.';
        DOM.costStall.classList.add('is-invalid');
        isValid = false;
      }
    }

    const travelVal = DOM.costTravel.value.trim();
    if (travelVal !== '') {
      const travelNum = Number(travelVal);
      if (isNaN(travelNum) || travelNum < 0) {
        DOM.errorCostTravel.textContent = 'Insira um valor numérico válido maior ou igual a zero.';
        DOM.costTravel.classList.add('is-invalid');
        isValid = false;
      }
    }

    const prizeVal = DOM.prizeWon.value.trim();
    if (prizeVal !== '') {
      const prizeNum = Number(prizeVal);
      if (isNaN(prizeNum) || prizeNum < 0) {
        DOM.errorPrizeWon.textContent = 'A premiação ganha não pode ser um número negativo.';
        DOM.prizeWon.classList.add('is-invalid');
        isValid = false;
      }
    }

    return isValid;
  }

  function openForm(raceToEdit = null) {
    clearFormErrors();
    DOM.formSection.classList.remove('hidden');
    DOM.btnToggleForm.setAttribute('aria-expanded', 'true');

    if (raceToEdit) {
      state.editingRaceId = raceToEdit.id;
      DOM.formHeading.textContent = `Editar Etapa: ${raceToEdit.name}`;
      DOM.btnSubmitText.textContent = 'Salvar Alterações';
      DOM.btnToggleText.textContent = 'Fechar Edição';

      DOM.raceId.value = raceToEdit.id;
      DOM.raceName.value = raceToEdit.name;
      DOM.raceLocation.value = raceToEdit.location;
      DOM.raceDate.value = raceToEdit.date;
      DOM.costEntry.value = raceToEdit.costEntry;
      DOM.costStall.value = raceToEdit.costStall;
      DOM.costTravel.value = raceToEdit.costTravel;
      DOM.prizeWon.value = raceToEdit.prizeWon;
      DOM.raceNotes.value = raceToEdit.notes || '';
    } else {
      state.editingRaceId = null;
      DOM.formHeading.textContent = 'Lançamento Financeiro de Etapa';
      DOM.btnSubmitText.textContent = 'Salvar Lançamento da Etapa';
      DOM.btnToggleText.textContent = 'Fechar Formulário';

      DOM.raceForm.reset();
      DOM.raceId.value = '';

      const today = new Date().toISOString().split('T')[0];
      DOM.raceDate.value = today;
    }

    updateLiveFormPreview();
    DOM.formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => DOM.raceName.focus(), 250);
  }

  function closeForm() {
    DOM.formSection.classList.add('hidden');
    DOM.btnToggleForm.setAttribute('aria-expanded', 'false');
    DOM.btnToggleText.textContent = 'Lançar Nova Prova / Etapa';
    DOM.raceForm.reset();
    clearFormErrors();
    state.editingRaceId = null;
  }

  function handleSaveRace(data) {
    const isEditing = Boolean(data.id);

    if (isEditing) {
      const index = state.races.findIndex(r => r.id === data.id);
      if (index !== -1) {
        state.races[index] = {
          ...state.races[index],
          name: data.name,
          location: data.location,
          date: data.date,
          costEntry: Number(data.costEntry) || 0,
          costStall: Number(data.costStall) || 0,
          costTravel: Number(data.costTravel) || 0,
          prizeWon: Number(data.prizeWon) || 0,
          notes: data.notes
        };
        StorageService.save(state.races);
        ToastService.show('Etapa Atualizada! 🐎', `"${data.name}" foi alterada com sucesso.`, 'success');
      }
    } else {
      const newRace = {
        id: generateId(),
        name: data.name,
        location: data.location,
        date: data.date,
        costEntry: Number(data.costEntry) || 0,
        costStall: Number(data.costStall) || 0,
        costTravel: Number(data.costTravel) || 0,
        prizeWon: Number(data.prizeWon) || 0,
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      };

      state.races.unshift(newRace);
      StorageService.save(state.races);

      const calc = FinancialCalculator.computeRace(newRace);
      if (calc.status === 'profit') {
        ToastService.show('Etapa Lucrativa Registrada! 🏆', `Parabéns! "${newRace.name}" rendeu um saldo de +${formatCurrency(calc.netBalance)}.`, 'success');
      } else {
        ToastService.show('Etapa Registrada! 🐎', `"${newRace.name}" foi adicionada ao seu controle da temporada.`, 'info');
      }
    }

    renderAll();
    closeForm();
  }

  function handleDeleteRace(raceId) {
    const race = state.races.find(r => r.id === raceId);
    if (!race) return;

    const confirmDelete = window.confirm(`Deseja realmente excluir a etapa "${race.name}"? Esta ação removerá os custos e premiações do balanço.`);
    if (!confirmDelete) return;

    state.races = state.races.filter(r => r.id !== raceId);
    StorageService.save(state.races);
    renderAll();
    ToastService.show('Etapa Excluída', `A prova "${race.name}" foi removida do histórico.`, 'info');
  }

  // --------------------------------------------------------------------------
  // 11. EXPORTAÇÃO CSV PARA PLANILHAS
  // --------------------------------------------------------------------------
  function exportToCsv() {
    if (state.races.length === 0) {
      ToastService.show('Sem Dados', 'Não há etapas cadastradas para exportar.', 'info');
      return;
    }

    const headers = ['Prova', 'Local/Haras', 'Data', 'Inscrição (R$)', 'Baia (R$)', 'Viagem (R$)', 'Custo Total (R$)', 'Premiação (R$)', 'Saldo Final (R$)', 'Status', 'Observações'];

    const rows = state.races.map(race => {
      const calc = FinancialCalculator.computeRace(race);
      const statusText = calc.status === 'profit' ? 'Lucro' : (calc.status === 'loss' ? 'Prejuízo' : 'Empate');
      return [
        `"${race.name.replace(/"/g, '""')}"`,
        `"${race.location.replace(/"/g, '""')}"`,
        `"${formatDateBR(race.date)}"`,
        calc.entry.toFixed(2),
        calc.stall.toFixed(2),
        calc.travel.toFixed(2),
        calc.totalCost.toFixed(2),
        calc.prize.toFixed(2),
        calc.netBalance.toFixed(2),
        `"${statusText}"`,
        `"${(race.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `barrelroad_temporada_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ToastService.show('CSV Exportado! 📊', 'Sua planilha de custos e premiações foi baixada.', 'success');
  }

  // --------------------------------------------------------------------------
  // 12. BINDINGS DE EVENTOS
  // --------------------------------------------------------------------------
  function initEventBindings() {
    // 1. Abrir/Fechar Formulário
    DOM.btnToggleForm.addEventListener('click', () => {
      if (DOM.formSection.classList.contains('hidden')) {
        openForm();
      } else {
        closeForm();
      }
    });

    DOM.btnCloseForm.addEventListener('click', closeForm);
    DOM.btnCancelForm.addEventListener('click', closeForm);
    DOM.btnEmptyAdd.addEventListener('click', () => openForm());

    // 2. Submissão do Formulário
    DOM.raceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateRaceForm()) return;

      const formData = {
        id: DOM.raceId.value || null,
        name: DOM.raceName.value.trim(),
        location: DOM.raceLocation.value.trim(),
        date: DOM.raceDate.value,
        costEntry: DOM.costEntry.value,
        costStall: DOM.costStall.value,
        costTravel: DOM.costTravel.value,
        prizeWon: DOM.prizeWon.value,
        notes: DOM.raceNotes.value.trim()
      };

      handleSaveRace(formData);
    });

    // 3. Atualização da Prévia Financeira ao digitar
    [DOM.costEntry, DOM.costStall, DOM.costTravel, DOM.prizeWon].forEach(input => {
      input.addEventListener('input', () => {
        updateLiveFormPreview();
        input.classList.remove('is-invalid');
      });
    });

    [DOM.raceName, DOM.raceLocation, DOM.raceDate].forEach(input => {
      input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
      });
    });

    // 4. Filtros por Abas (Todas, Lucro, Prejuízo, Neutro)
    DOM.filterChipsGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      DOM.chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.currentFilter = chip.getAttribute('data-filter') || 'all';
      renderRacesList();
    });

    // 5. Pesquisa Textual em Tempo Real
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      DOM.btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
      renderRacesList();
    });

    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.searchQuery = '';
      DOM.btnClearSearch.style.display = 'none';
      DOM.searchInput.focus();
      renderRacesList();
    });

    // 6. Delegação de Eventos na Grade de Cards (Editar / Excluir)
    DOM.racesContainer.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.js-btn-edit');
      if (btnEdit) {
        const raceId = btnEdit.getAttribute('data-id');
        const race = state.races.find(r => r.id === raceId);
        if (race) openForm(race);
        return;
      }

      const btnDelete = e.target.closest('.js-btn-delete');
      if (btnDelete) {
        const raceId = btnDelete.getAttribute('data-id');
        handleDeleteRace(raceId);
        return;
      }
    });

    // 7. Ações de Cabeçalho: Imprimir e Exportar CSV
    DOM.btnPrintReport.addEventListener('click', () => window.print());
    DOM.btnExportCsv.addEventListener('click', exportToCsv);

    // 8. Reset de Dados (Rodapé)
    DOM.btnResetData.addEventListener('click', () => {
      const confirmReset = window.confirm('Deseja restaurar as etapas de exemplo padrão da temporada? Os dados atuais serão substituídos.');
      if (confirmReset) {
        StorageService.reset();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 13. INICIALIZAÇÃO DA APLICAÇÃO (BOOTSTRAP)
  // --------------------------------------------------------------------------
  function init() {
    DOM.currentYear.textContent = new Date().getFullYear();
    state.races = StorageService.load();
    initEventBindings();
    renderAll();
    console.log('🐎 BarrelRoad pronto para a temporada de Três Tambores!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
