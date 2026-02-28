// ------------------------------------------------------------
// VARIABLES GLOBALES
// ------------------------------------------------------------
let ejercicios = [];
let preguntasActuales = [];
let respuestasUsuario = [];
let chartInstance = null;

// ------------------------------------------------------------
// CARGA DE EJERCICIOS DESDE JSON
// ------------------------------------------------------------
async function cargarEjercicios() {
  try {
    const response = await fetch('ejercicios.json');
    ejercicios = await response.json();
    // Asignar id secuencial (por si acaso)
    ejercicios.forEach((ex, idx) => ex.id = idx);
    cargarSelector();
    cargarEjercicio();
  } catch (error) {
    console.error('Error cargando ejercicios:', error);
    // Fallback: usar generación interna si falla el fetch
    ejercicios = generarEjerciciosFallback();
    cargarSelector();
    cargarEjercicio();
  }
}

// Función de respaldo por si no se puede cargar el JSON
function generarEjerciciosFallback() {
  // Aquí iría la misma función de generación de los 50 ejercicios
  // Por brevedad, omito el código (es el mismo que se usaba antes)
  // En la implementación real, se incluiría la función completa.
  // Para este ejemplo, retornamos un array vacío (no debería ocurrir)
  return [];
}

// ------------------------------------------------------------
// FUNCIONES DE CÁLCULO (igual que antes, con toFixed(1))
// ------------------------------------------------------------
function obtenerCorteX(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma === 'circulo') return "No hay (círculo)";
      if (ex.forma.includes('y2')) {
        let val = ex.forma === 'y2 = x+1' ? -1 : 1;
        return `(${val},0)`;
      }
      return "No hay";
    }
    if (ex.tipo === 'sqrt') {
      if (ex.reflexion) return `(${ex.a},0)`;
      else return `(${ex.a},0)`;
    }
    if (ex.tipo === 'lineal') {
      if (ex.m === 0) return ex.b === 0 ? "Todo ℝ" : "No hay";
      let x = -ex.b / ex.m;
      return `(${x.toFixed(1)},0)`;
    }
    if (ex.tipo === 'quad') {
      if (ex.h !== undefined) {
        let k = ex.k;
        if (k === 0) return `(${ex.h},0)`;
        if (-k/ex.a < 0) return "No hay";
        let sqrtVal = Math.sqrt(-k/ex.a);
        let x1 = ex.h - sqrtVal, x2 = ex.h + sqrtVal;
        return x1 === x2 ? `(${x1.toFixed(1)},0)` : `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
      } else {
        let disc = ex.b*ex.b - 4*ex.a*ex.c;
        if (disc < 0) return "No hay";
        if (disc === 0) return `(${(-ex.b/(2*ex.a)).toFixed(1)},0)`;
        let x1 = (-ex.b - Math.sqrt(disc))/(2*ex.a);
        let x2 = (-ex.b + Math.sqrt(disc))/(2*ex.a);
        return `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
      }
    }
    if (ex.tipo === 'exp') return "No hay";
    if (ex.tipo === 'abs') {
      if (ex.k === 0) return `(${ex.h},0)`;
      if (-ex.k/ex.a < 0) return "No hay";
      let d = Math.abs(-ex.k/ex.a);
      return `(${(ex.h - d).toFixed(1)},0) y (${(ex.h + d).toFixed(1)},0)`;
    }
    return "No disponible";
  } catch { return "Error"; }
}

function obtenerCorteY(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma === 'circulo') return `(0, ${Math.sqrt(ex.r2).toFixed(1)}) y (0, -${Math.sqrt(ex.r2).toFixed(1)})`;
      if (ex.forma.includes('y2')) {
        let a = ex.forma === 'y2 = x+1' ? 1 : -1;
        if (a < 0) return "No hay";
        return `(0, ${Math.sqrt(a).toFixed(1)}) y (0, -${Math.sqrt(a).toFixed(1)})`;
      }
    }
    if (ex.tipo === 'sqrt') {
      let val = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (val < 0) return "No hay";
      let y = Math.sqrt(val) + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    if (ex.tipo === 'lineal') return `(0, ${ex.b})`;
    if (ex.tipo === 'quad') {
      if (ex.h !== undefined) {
        let y = ex.a * (0 - ex.h)**2 + ex.k;
        return `(0, ${y.toFixed(1)})`;
      } else return `(0, ${ex.c})`;
    }
    if (ex.tipo === 'exp') {
      let base = ex.base === 'e' ? Math.E : ex.base;
      let y = Math.pow(base, -ex.a) + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    if (ex.tipo === 'abs') {
      let y = ex.a * Math.abs(0 - ex.h) + ex.k;
      return `(0, ${y.toFixed(1)})`;
    }
    return "No disponible";
  } catch { return "Error"; }
}

function obtenerDominio(ex) {
  if (ex.tipo === 'producto') return "Conjunto finito";
  if (ex.tipo === 'sqrt') {
    if (ex.reflexion) return `(-∞, ${ex.a}]`;
    else return `[${ex.a}, ∞)`;
  }
  if (ex.tipo === 'lineal' || ex.tipo === 'quad' || ex.tipo === 'abs' || ex.tipo === 'exp') return "ℝ";
  if (ex.tipo === 'relacion') {
    if (ex.forma === 'circulo') return `[${-Math.sqrt(ex.r2).toFixed(1)}, ${Math.sqrt(ex.r2).toFixed(1)}]`;
    if (ex.forma.includes('y2')) {
      let a = ex.forma === 'y2 = x+1' ? -1 : 1;
      return a >= 0 ? `[${-a}, ∞)` : `(-∞, ${-a}]`;
    }
  }
  return "ℝ";
}

function obtenerRango(ex) {
  if (ex.tipo === 'producto') return "Conjunto finito";
  if (ex.tipo === 'sqrt') {
    let minY = ex.desplazamientoV || 0;
    return `[${minY.toFixed(1)}, ∞)`;
  }
  if (ex.tipo === 'lineal') {
    if (ex.m === 0) return `{${ex.b}}`;
    return "ℝ";
  }
  if (ex.tipo === 'quad') {
    if (ex.h !== undefined) {
      return ex.a > 0 ? `[${ex.k.toFixed(1)}, ∞)` : `(-∞, ${ex.k.toFixed(1)}]`;
    } else {
      let verticeY = ex.c - (ex.b*ex.b)/(4*ex.a);
      return ex.a > 0 ? `[${verticeY.toFixed(1)}, ∞)` : `(-∞, ${verticeY.toFixed(1)}]`;
    }
  }
  if (ex.tipo === 'exp') {
    let desp = ex.desplazamientoV || 0;
    return `(${desp.toFixed(1)}, ∞)`;
  }
  if (ex.tipo === 'abs') return `[${ex.k.toFixed(1)}, ∞)`;
  if (ex.tipo === 'relacion') {
    if (ex.forma === 'circulo') return `[${-Math.sqrt(ex.r2).toFixed(1)}, ${Math.sqrt(ex.r2).toFixed(1)}]`;
    if (ex.forma.includes('y2')) return "[0, ∞)";
  }
  return "ℝ";
}

function obtenerSimetria(ex) {
  if (ex.tipo === 'producto') return 3;
  if (ex.tipo === 'relacion' && ex.forma === 'circulo') return 2;
  if (ex.tipo === 'lineal' && ex.m === 0) return 3;
  if (ex.tipo === 'quad') {
    if (ex.h !== undefined && ex.h === 0) return 1;
    if (ex.b === 0) return 1;
  }
  if (ex.tipo === 'abs' && ex.h === 0) return 1;
  return 3;
}

function obtenerMonotonia(ex) {
  if (ex.tipo === 'producto') return 3;
  if (ex.tipo === 'lineal') {
    if (ex.m > 0) return 0;
    if (ex.m < 0) return 1;
    return 2;
  }
  if (ex.tipo === 'quad') return 3;
  if (ex.tipo === 'sqrt') return ex.reflexion ? 1 : 0;
  if (ex.tipo === 'exp') return 0;
  if (ex.tipo === 'abs') return 3;
  return 3;
}

function esFuncion(ex) {
  if (ex.tipo === 'relacion' && (ex.forma === 'circulo' || ex.forma.includes('y2'))) return 1;
  if (ex.tipo === 'producto') return 1;
  return 0;
}

function esTotal(ex) {
  if (ex.tipo === 'sqrt' || ex.tipo === 'relacion' || ex.tipo === 'producto') return 1;
  return 0;
}

function esInyectiva(ex) {
  if (ex.tipo === 'lineal' && ex.m !== 0) return 0;
  if (ex.tipo === 'quad') return 1;
  if (ex.tipo === 'abs') return 1;
  if (ex.tipo === 'sqrt') return 0;
  if (ex.tipo === 'exp') return 0;
  return 0;
}

function generarVerdaderoFalso(ex) {
  let dom = obtenerDominio(ex);
  let ran = obtenerRango(ex);
  let cx = obtenerCorteX(ex);
  let cy = obtenerCorteY(ex);
  let func = esFuncion(ex) === 0 ? "Sí" : "No";
  return [
    { texto: `El dominio es ${dom}`, correcta: 0 },
    { texto: `El rango es ${ran}`, correcta: 0 },
    { texto: `El punto de corte con X es ${cx}`, correcta: 0 },
    { texto: `El punto de corte con Y es ${cy}`, correcta: 0 },
    { texto: `¿Es función? ${func}`, correcta: esFuncion(ex) },
    { texto: `La función es inyectiva`, correcta: esInyectiva(ex) }
  ];
}

// ------------------------------------------------------------
// GENERAR PREGUNTAS (SOLO SECCIONES 1-4)
// ------------------------------------------------------------
function generarPreguntasParaEjercicio(ex) {
  let preguntas = [];

  if (ex.tipo === 'producto') {
    preguntas.push({
      seccion: "SECCIÓN 1 — Producto cartesiano",
      texto: "Cardinalidad de A × B",
      opciones: [ex.A.length * ex.B.length + "", "|A|+|B|", "|A|", "|B|"],
      correcta: 0,
      explicacion: `A tiene ${ex.A.length} elementos, B tiene ${ex.B.length}. |A×B| = ${ex.A.length} × ${ex.B.length} = ${ex.A.length * ex.B.length}.`
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "¿El par (0,2) ∈ A × B?",
      opciones: ["Verdadero", "Falso"],
      correcta: (ex.A.includes(0) && ex.B.includes(2)) ? 0 : 1,
      explicacion: (ex.A.includes(0) && ex.B.includes(2)) ? "0 ∈ A y 2 ∈ B, por tanto pertenece." : "0 no está en A o 2 no está en B."
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "A ⊆ B",
      opciones: ["V", "F"],
      correcta: ex.A.every(v => ex.B.includes(v)) ? 0 : 1,
      explicacion: ex.A.every(v => ex.B.includes(v)) ? "Todos los elementos de A están en B." : "Hay elementos de A que no están en B."
    });
  } else {
    let cx = obtenerCorteX(ex);
    let cy = obtenerCorteY(ex);
    let sim = obtenerSimetria(ex);
    let mon = obtenerMonotonia(ex);
    let func = esFuncion(ex);
    let dom = obtenerDominio(ex);
    let ran = obtenerRango(ex);
    let total = esTotal(ex);
    let iny = esInyectiva(ex);

    preguntas.push({
      seccion: "SECCIÓN 1 — Construcción",
      texto: "Punto de corte con eje X",
      opciones: [cx, "(0,0)", "No hay", "(1,0)"],
      correcta: 0,
      explicacion: `Para hallar corte con X, hacemos y=0. Resolviendo se obtiene: ${cx}.`
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "Punto de corte con eje Y",
      opciones: [cy, "(0,0)", "No hay", "(0,1)"],
      correcta: 0,
      explicacion: `Para hallar corte con Y, hacemos x=0. Se obtiene: ${cy}.`
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "Simetría respecto a",
      opciones: ["Eje X", "Eje Y", "Origen", "Ninguna"],
      correcta: sim,
      explicacion: ["Simetría respecto al eje X", "Simetría respecto al eje Y", "Simetría respecto al origen", "No presenta simetría"][sim]
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "Comportamiento (monotonía)",
      opciones: ["Creciente", "Decreciente", "Constante", "No monótona"],
      correcta: mon,
      explicacion: ["La función es creciente en su dominio.", "La función es decreciente.", "Es constante.", "No es monótona (cambia crecimiento)."][mon]
    });
    preguntas.push({
      seccion: "SECCIÓN 1",
      texto: "¿Representa una función?",
      opciones: ["Sí", "No"],
      correcta: func,
      explicacion: func === 0 ? "Cada x tiene una única imagen." : "Hay valores de x con dos imágenes posibles."
    });

    preguntas.push({
      seccion: "SECCIÓN 2 — Dominio y rango",
      texto: "Dominio (intervalo)",
      opciones: [dom, "ℝ", "[0,∞)", "(-∞,0]"],
      correcta: 0,
      explicacion: `El dominio es ${dom}.`
    });
    preguntas.push({
      seccion: "SECCIÓN 2",
      texto: "Rango (intervalo)",
      opciones: [ran, "ℝ", "[0,∞)", "(-∞,0]"],
      correcta: 0,
      explicacion: `El rango es ${ran}.`
    });

    preguntas.push({
      seccion: "SECCIÓN 3 — Definición formal",
      texto: "¿Es una función total respecto a ℝ?",
      opciones: ["Sí", "No"],
      correcta: total,
      explicacion: total === 0 ? "Está definida para todo ℝ." : "No está definida en todo ℝ."
    });
    preguntas.push({
      seccion: "SECCIÓN 3",
      texto: "¿Es inyectiva?",
      opciones: ["Sí", "No"],
      correcta: iny,
      explicacion: iny === 0 ? "Valores distintos de x dan imágenes distintas." : "Hay valores de x distintos con la misma imagen."
    });

    let vf = generarVerdaderoFalso(ex);
    vf.forEach((item, i) => {
      preguntas.push({
        seccion: "SECCIÓN 4 — Verdadero/Falso",
        texto: item.texto,
        opciones: ["V", "F"],
        correcta: item.correcta,
        explicacion: "Afirmación basada en las propiedades calculadas."
      });
    });
  }
  return preguntas;
}

// ------------------------------------------------------------
// FUNCIONES DE INTERFAZ
// ------------------------------------------------------------
function cargarSelector() {
  let select = document.getElementById('exerciseSelect');
  select.innerHTML = '';
  ejercicios.forEach((_, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Ejercicio #${String(i+1).padStart(2,'0')}`;
    select.appendChild(opt);
  });
}

function cargarEjercicio() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  let ex = ejercicios[idx];
  document.getElementById('mathDisplay').innerHTML = `\\( ${ex.latex} \\)`;
  if (window.MathJax) MathJax.typesetPromise();

  let preguntasBase = generarPreguntasParaEjercicio(ex);
  preguntasActuales = preguntasBase.map(p => {
    let opciones = [...p.opciones];
    let correctaOriginal = p.correcta;
    let valorCorrecto = opciones[correctaOriginal];
    for (let i = opciones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }
    let nuevoIndiceCorrecto = opciones.indexOf(valorCorrecto);
    return {
      seccion: p.seccion,
      texto: p.texto,
      opciones: opciones,
      correcta: nuevoIndiceCorrecto,
      explicacion: p.explicacion
    };
  });

  renderizarPreguntas();
  respuestasUsuario = new Array(preguntasActuales.length).fill(null);
  document.getElementById('globalResult').classList.add('d-none');
  actualizarProgreso(0);
}

function renderizarPreguntas() {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '';

  preguntasActuales.forEach((p, idx) => {
    const col = document.createElement('div');
    col.className = 'col-md-6';
    const card = document.createElement('div');
    card.className = 'pregunta-card';
    card.id = `card-${idx}`;
    let opcionesHtml = '';
    p.opciones.forEach((opt, oIdx) => {
      opcionesHtml += `
        <div class="form-check mb-2">
          <input class="form-check-input" type="radio" name="preg_${idx}" id="radio_${idx}_${oIdx}" value="${oIdx}" onchange="guardarRespuesta(${idx}, ${oIdx})">
          <label class="form-check-label w-100" for="radio_${idx}_${oIdx}">${opt}</label>
        </div>
      `;
    });
    card.innerHTML = `
      <p class="fw-bold mb-3">${p.seccion}</p>
      <p>${p.texto}</p>
      <div class="options-list">${opcionesHtml}</div>
      <div id="feedback-${idx}" class="mt-2"></div>
    `;
    col.appendChild(card);
    container.appendChild(col);
  });
}

window.guardarRespuesta = function(idx, valor) {
  respuestasUsuario[idx] = valor;
};

function verificarTodo() {
  let correctas = 0;
  preguntasActuales.forEach((p, idx) => {
    let seleccion = respuestasUsuario[idx];
    let feedback = document.getElementById(`feedback-${idx}`);
    let card = document.getElementById(`card-${idx}`);
    if (seleccion === null) {
      feedback.innerHTML = `<div class="text-danger small fw-bold"><i class="bi bi-x-circle"></i> Sin responder</div>`;
      card.style.borderLeftColor = 'var(--danger)';
    } else if (seleccion === p.correcta) {
      feedback.innerHTML = `<div class="text-success small fw-bold"><i class="bi bi-check-circle"></i> Correcto</div><div class="explicacion">${p.explicacion}</div>`;
      card.style.borderLeftColor = 'var(--success)';
      correctas++;
    } else {
      feedback.innerHTML = `<div class="text-danger small fw-bold"><i class="bi bi-x-circle"></i> Incorrecto. La respuesta era: ${p.opciones[p.correcta]}</div><div class="explicacion">${p.explicacion}</div>`;
      card.style.borderLeftColor = 'var(--danger)';
    }
  });

  let total = preguntasActuales.length;
  let porcentaje = Math.round(correctas/total*100);
  let globalDiv = document.getElementById('globalResult');
  globalDiv.className = `alert d-block mt-5 text-center shadow-lg border-0 py-4 ${correctas === total ? 'alert-success' : 'alert-info'}`;
  globalDiv.innerHTML = `<h4>Resultado: ${correctas} / ${total} (${porcentaje}%)</h4><p class="mb-0">Sigue practicando para perfeccionar tu análisis funcional.</p>`;
  globalDiv.classList.remove('d-none');
  actualizarProgreso(correctas);
}

function actualizarProgreso(correctas) {
  document.getElementById('progressBadge').innerText = `${correctas} / 50`;
}

function reiniciarTodo() {
  respuestasUsuario.fill(null);
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('[id^="feedback-"]').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.pregunta-card').forEach(card => card.style.borderLeftColor = 'var(--primary)');
  document.getElementById('globalResult').classList.add('d-none');
  actualizarProgreso(0);
}

function generarGrafica() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  let ex = ejercicios[idx];
  let ctx = document.getElementById('mainChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  if (ex.tipo === 'producto') {
    alert('Ejercicio de producto cartesiano: no hay gráfica continua.');
    return;
  }

  let rango = [-5, 5];
  if (ex.tipo === 'sqrt') {
    if (ex.reflexion) rango = [ex.a - 5, ex.a + 2];
    else rango = [ex.a - 2, ex.a + 8];
  } else if (ex.tipo === 'relacion' && ex.forma === 'circulo') {
    let radio = Math.sqrt(ex.r2);
    rango = [-radio - 1, radio + 1];
  }

  let labels = [];
  let data = [];
  for (let i = 0; i <= 200; i++) {
    let x = rango[0] + i * (rango[1] - rango[0]) / 200;
    labels.push(x);
    try {
      if (ex.tipo === 'sqrt') {
        let val = ex.reflexion ? ex.a - x : x - ex.a;
        data.push(val >= 0 ? Math.sqrt(val) + (ex.desplazamientoV||0) : null);
      } else if (ex.tipo === 'quad') {
        if (ex.h !== undefined) data.push(ex.a * (x - ex.h)**2 + ex.k);
        else data.push(ex.a * x*x + ex.b*x + ex.c);
      } else if (ex.tipo === 'lineal') {
        data.push(ex.m * x + ex.b);
      } else if (ex.tipo === 'exp') {
        let base = ex.base === 'e' ? Math.E : ex.base;
        data.push(Math.pow(base, x - ex.a) + (ex.desplazamientoV||0));
      } else if (ex.tipo === 'abs') {
        data.push(ex.a * Math.abs(x - ex.h) + ex.k);
      } else if (ex.tipo === 'relacion') {
        if (ex.forma === 'circulo') {
          let r = Math.sqrt(ex.r2);
          data.push(Math.abs(x) <= r ? Math.sqrt(r*r - x*x) : null);
        } else if (ex.forma.includes('y2')) {
          let val = ex.forma === 'y2 = x+1' ? x+1 : x-1;
          data.push(val >= 0 ? Math.sqrt(val) : null);
        } else data.push(null);
      } else data.push(null);
    } catch { data.push(null); }
  }

  let datasets = [{
    label: ex.latex,
    data: data,
    borderColor: '#2b6cb0',
    borderWidth: 3,
    fill: false,
    tension: 0.4,
    pointRadius: 0
  }];

  if (ex.tipo === 'relacion' && ex.forma === 'circulo') {
    let dataNeg = labels.map((x, i) => {
      let r = Math.sqrt(ex.r2);
      return Math.abs(x) <= r ? -Math.sqrt(r*r - x*x) : null;
    });
    datasets.push({
      label: 'y = -√',
      data: dataNeg,
      borderColor: '#ed8936',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4
    });
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ------------------------------------------------------------
// MODO OSCURO
// ------------------------------------------------------------
function initDarkMode() {
  const toggleButtons = ['darkModeToggle', 'darkModeFloating'];
  const body = document.body;
  const iconElements = [document.getElementById('darkModeIcon'), document.querySelector('#darkModeFloating i')];

  function updateIcons() {
    const isDark = body.classList.contains('dark-mode');
    iconElements.forEach(icon => {
      if (icon) icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    });
  }

  toggleButtons.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      updateIcons();
    });
  });

  updateIcons();
}

// ------------------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------------------
window.onload = function() {
  initDarkMode();
  cargarEjercicios(); // Asíncrono
  document.getElementById('exerciseSelect').addEventListener('change', cargarEjercicio);
};