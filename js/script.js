(function() {
        const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

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

        function pad(n) { return String(n).padStart(2, '0'); }

        function keyFor(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }

        function isToday(y, m, d) {
            return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
        }

        function render() {
            monthLabel.textContent = `${MESES[viewMonth]} ${viewYear}`;
            grid.innerHTML = '';

            const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                const blank = document.createElement('div');
                blank.className = 'cell empty';
                grid.appendChild(blank);
            }

            for (let d = 1; d <= daysInMonth; d++) {
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

        function openPanel(key, dayNum) {
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

        function closePanel() {
            overlay.classList.remove('open');
            panel.classList.remove('open');
            activeKey = null;
            render();
        }

        function persistCurrentNote() {
            if (!activeKey) return;
            const text = noteArea.value;
            if (text.trim() === '') {
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

        document.getElementById('panelClose').addEventListener('click', () => { persistCurrentNote();
            closePanel(); });
        document.getElementById('btnCloseSave').addEventListener('click', () => { persistCurrentNote();
            closePanel(); });
        overlay.addEventListener('click', () => { persistCurrentNote();
            closePanel(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.classList.contains('open')) { persistCurrentNote();
                closePanel(); }
        });

        document.getElementById('btnClearNote').addEventListener('click', () => {
            noteArea.value = '';
            persistCurrentNote();
        });

        document.getElementById('prevMonth').addEventListener('click', () => {
            viewMonth--;
            if (viewMonth < 0) { viewMonth = 11;
                viewYear--; }
            render();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            viewMonth++;
            if (viewMonth > 11) { viewMonth = 0;
                viewYear++; }
            render();
        });
        document.getElementById('btnToday').addEventListener('click', () => {
            viewYear = today.getFullYear();
            viewMonth = today.getMonth();
            render();
        });

        // ---------- Exportar PDF do mês (com o mesmo visual do site) ----------
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        async function exportPdf() {
            const btn = document.getElementById('btnExportPdf');
            const originalLabel = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Gerando PDF...';

            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const firstDay = new Date(viewYear, viewMonth, 1).getDay();

            // Monta uma versão "para impressão" do calendário: mesmas cores e fontes
            // do site, mas com o texto da anotação inteiro visível (sem cortar).
            const sheet = document.createElement('div');
            sheet.style.cssText = `
      position:fixed; left:-9999px; top:0; width:900px;
      background:#faf6ef; padding:36px; font-family:'Inter',sans-serif;
    `;

            let html = `
      <h1 style="font-family:'Fraunces',serif;font-weight:600;font-size:1.9rem;margin:0 0 2px;color:#262220;">Diário do Mês</h1>
      <h2 style="font-family:'Fraunces',serif;font-weight:500;font-size:1.35rem;margin:0 0 22px;color:#262220;">${MESES[viewMonth]} ${viewYear}</h2>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:8px;">
        ${DIAS_SEMANA.map(d => `<span style="font-size:0.72rem;font-weight:600;color:#6b6560;">${d.slice(0,3)}</span>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
    `;

    for(let i=0; i<firstDay; i++){ html += `<div></div>`; }

    for(let d=1; d<=daysInMonth; d++){
      const key = keyFor(viewYear, viewMonth, d);
      const note = notes[key] || '';
      const highlight = isToday(viewYear, viewMonth, d);
      html += `
        <div style="
          border:1px solid ${highlight ? '#c1673b' : '#dad2c2'};
          border-radius:8px; padding:9px 10px; min-height:64px;
          background:#ffffff; break-inside:avoid;
        ">
          <div style="font-family:'Fraunces',serif;font-weight:500;font-size:1rem;
            color:${highlight ? '#c1673b' : '#262220'}; margin-bottom:4px;">${d}</div>
          <div style="font-size:0.68rem;line-height:1.4;color:#4a4642;
            white-space:pre-wrap;word-break:break-word;">${escapeHtml(note)}</div>
        </div>
      `;
    }
    html += `</div>`;
    sheet.innerHTML = html;
    document.body.appendChild(sheet);

    try{
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#faf6ef' });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while(heightLeft > 0){
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${MESES[viewMonth]}-${viewYear}.pdf`);
    } catch(err){
      alert('Não foi possível gerar o PDF. Tente novamente.');
      console.error(err);
    } finally {
      document.body.removeChild(sheet);
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  document.getElementById('btnExportPdf').addEventListener('click', exportPdf);

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