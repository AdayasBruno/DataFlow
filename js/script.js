(function(){
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DIAS_SEMANA = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];

  let today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-11
  let notes = {}; // key "YYYY-MM-DD" -> text
  let activeKey = null;
  let saveTimeout = null;

  const grid = document.getElementById('grid');
  const monthLabel = document.getElementById('monthLabel');
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  const noteArea = document.getElementById('noteArea');
  const panelDate = document.getElementById('panelDate');
  const panelWeekday = document.getElementById('panelWeekday');
  const saveState = document.getElementById('saveState');

  function pad(n){ return String(n).padStart(2,'0'); }
  function keyFor(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
  function isToday(y,m,d){
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  }

  function render(){
    monthLabel.textContent = `${MESES[viewMonth]} ${viewYear}`;
    grid.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for(let i=0; i<firstDay; i++){
      const blank = document.createElement('div');
      blank.className = 'cell empty';
      grid.appendChild(blank);
    }

    for(let d=1; d<=daysInMonth; d++){
      const key = keyFor(viewYear, viewMonth, d);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell' + (isToday(viewYear, viewMonth, d) ? ' today' : '') + (notes[key] ? ' has-note' : '');
      cell.setAttribute('data-key', key);

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d;

      const preview = document.createElement('div');
      preview.className = 'preview';
      preview.textContent = notes[key] || '';

      const foot = document.createElement('div');
      foot.className = 'foot';
      const dot = document.createElement('span');
      dot.className = 'dot';
      foot.appendChild(dot);

      cell.appendChild(num);
      cell.appendChild(preview);
      cell.appendChild(foot);
      cell.addEventListener('click', () => openPanel(key, d));

      grid.appendChild(cell);
    }
  }

  function openPanel(key, dayNum){
    activeKey = key;
    const dateObj = new Date(viewYear, viewMonth, dayNum);
    panelWeekday.textContent = DIAS_SEMANA[dateObj.getDay()];
    panelDate.textContent = `${dayNum} de ${MESES[viewMonth]}`;
    noteArea.value = notes[key] || '';
    saveState.textContent = '';
    overlay.classList.add('open');
    panel.classList.add('open');
    setTimeout(() => noteArea.focus(), 200);
  }

  function closePanel(){
    overlay.classList.remove('open');
    panel.classList.remove('open');
    activeKey = null;
    render();
  }

  function persistCurrentNote(){
    if(!activeKey) return;
    const text = noteArea.value;
    if(text.trim() === ''){
      delete notes[activeKey];
    } else {
      notes[activeKey] = text;
    }
    saveState.textContent = 'Salvo ✓';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => { saveState.textContent = ''; }, 1400);
  }

  noteArea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persistCurrentNote, 350);
  });

  document.getElementById('panelClose').addEventListener('click', () => { persistCurrentNote(); closePanel(); });
  document.getElementById('btnCloseSave').addEventListener('click', () => { persistCurrentNote(); closePanel(); });
  overlay.addEventListener('click', () => { persistCurrentNote(); closePanel(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && panel.classList.contains('open')){ persistCurrentNote(); closePanel(); }
  });

  document.getElementById('btnClearNote').addEventListener('click', () => {
    noteArea.value = '';
    persistCurrentNote();
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    render();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    render();
  });
  document.getElementById('btnToday').addEventListener('click', () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
  });

  // ---------- Exportar planilha do mês (.xlsx) ----------
  document.getElementById('btnExportXlsx').addEventListener('click', () => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows = [["Dia", "Data", "Dia da semana", "Anotação"]];
    for(let d=1; d<=daysInMonth; d++){
      const key = keyFor(viewYear, viewMonth, d);
      const dateObj = new Date(viewYear, viewMonth, d);
      rows.push([
        d,
        `${pad(d)}/${pad(viewMonth+1)}/${viewYear}`,
        DIAS_SEMANA[dateObj.getDay()],
        notes[key] || ''
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:5},{wch:12},{wch:16},{wch:60}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MESES[viewMonth].slice(0,31));
    XLSX.writeFile(wb, `${MESES[viewMonth]}-${viewYear}.xlsx`);
  });

  // ---------- Salvar / carregar anotações (JSON) ----------
  document.getElementById('btnSaveJson').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anotacoes-diario-do-mes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('loadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const loaded = JSON.parse(ev.target.result);
        notes = Object.assign({}, notes, loaded);
        render();
      } catch(err){
        alert('Não foi possível ler este arquivo. Verifique se é o arquivo de anotações salvo por este site.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  render();
})();
