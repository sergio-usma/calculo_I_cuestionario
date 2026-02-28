// ------------------------------------------------------------
// CONSTANTES DE CONFIGURACIÓN GLOBAL
// ------------------------------------------------------------
const MAX_ABS = 50; // Límite absoluto para ambos ejes
const PRECISION = 2;

// ------------------------------------------------------------
// VARIABLES GLOBALES
// ------------------------------------------------------------
let ejercicios = [];
let preguntasActuales = [];
let respuestasUsuario = [];
let chartInstance = null;

// ------------------------------------------------------------
// FUNCIÓN DE REDONDEO
// ------------------------------------------------------------
function redondear(num) {
  return parseFloat(num.toFixed(PRECISION));
}

// ------------------------------------------------------------
// CARGA DE EJERCICIOS DESDE JSON
// ------------------------------------------------------------
async function cargarEjercicios() {
  try {
    const response = await fetch('ejercicios.json');
    ejercicios = await response.json();
    ejercicios.forEach((ex, idx) => ex.id = idx);
  } catch (error) {
    console.error('Error cargando ejercicios:', error);
    ejercicios = [];
  }
  cargarSelector();
  cargarEjercicio();
}

// ------------------------------------------------------------
// FUNCIONES DE CÁLCULO (con toFixed(1) para mostrar)
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

function esFuncion(ex) {
  if (ex.tipo === 'relacion' && (ex.forma === 'circulo' || ex.forma.includes('y2'))) return 1;
  if (ex.tipo === 'producto') return 1;
  return 0;
}

function obtenerVertice(ex) {
  if (ex.tipo !== 'quad') return null;
  try {
    if (ex.h !== undefined) {
      return `(${ex.h.toFixed(1)}, ${ex.k.toFixed(1)})`;
    } else {
      let a = ex.a, b = ex.b, c = ex.c;
      let xv = -b / (2 * a);
      let yv = a * xv * xv + b * xv + c;
      return `(${xv.toFixed(1)}, ${yv.toFixed(1)})`;
    }
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// GENERAR PREGUNTAS (solo temas vistos)
// ------------------------------------------------------------
function generarPreguntasParaEjercicio(ex) {
  let preguntas = [];

  if (ex.tipo === 'producto') {
    preguntas.push({
      texto: "Cardinalidad de A × B",
      opciones: [ex.A.length * ex.B.length + "", "|A|+|B|", "|A|", "|B|"],
      correcta: 0,
      explicacion: `A tiene ${ex.A.length} elementos, B tiene ${ex.B.length}. |A×B| = ${ex.A.length} × ${ex.B.length} = ${ex.A.length * ex.B.length}.`
    });
    preguntas.push({
      texto: "¿El par (0,2) ∈ A × B?",
      opciones: ["Verdadero", "Falso"],
      correcta: (ex.A.includes(0) && ex.B.includes(2)) ? 0 : 1,
      explicacion: (ex.A.includes(0) && ex.B.includes(2)) ? "0 ∈ A y 2 ∈ B, por tanto pertenece." : "0 no está en A o 2 no está en B."
    });
    preguntas.push({
      texto: "A ⊆ B",
      opciones: ["V", "F"],
      correcta: ex.A.every(v => ex.B.includes(v)) ? 0 : 1,
      explicacion: ex.A.every(v => ex.B.includes(v)) ? "Todos los elementos de A están en B." : "Hay elementos de A que no están en B."
    });
  } else {
    let cx = obtenerCorteX(ex);
    let cy = obtenerCorteY(ex);
    let dom = obtenerDominio(ex);
    let ran = obtenerRango(ex);
    let func = esFuncion(ex);

    // Preguntas básicas
    preguntas.push({
      texto: "Punto de corte con eje X",
      opciones: [cx, "(0,0)", "No hay", "(1,0)"],
      correcta: 0,
      explicacion: `Para hallar corte con X, hacemos y=0. Resolviendo se obtiene: ${cx}.`
    });
    preguntas.push({
      texto: "Punto de corte con eje Y",
      opciones: [cy, "(0,0)", "No hay", "(0,1)"],
      correcta: 0,
      explicacion: `Para hallar corte con Y, hacemos x=0. Se obtiene: ${cy}.`
    });
    preguntas.push({
      texto: "Dominio (intervalo)",
      opciones: [dom, "ℝ", "[0,∞)", "(-∞,0]"],
      correcta: 0,
      explicacion: `El dominio es ${dom}.`
    });
    preguntas.push({
      texto: "Rango (intervalo)",
      opciones: [ran, "ℝ", "[0,∞)", "(-∞,0]"],
      correcta: 0,
      explicacion: `El rango es ${ran}.`
    });
    preguntas.push({
      texto: "¿Representa una función?",
      opciones: ["Sí", "No"],
      correcta: func,
      explicacion: func === 0 ? "Cada x tiene una única imagen." : "Hay valores de x con dos imágenes posibles."
    });

    // Pregunta adicional para cuadráticas: vértice
    if (ex.tipo === 'quad') {
      let vertice = obtenerVertice(ex);
      if (vertice) {
        preguntas.push({
          texto: "Coordenadas del vértice",
          opciones: [vertice, "(0,0)", "No tiene vértice", "(1,1)"],
          correcta: 0,
          explicacion: `El vértice de la parábola es ${vertice}.`
        });
      }
    }

    // Afirmaciones de verdadero/falso (sin inyectividad)
    let afirmaciones = [
      { texto: `El dominio es ${dom}`, correcta: 0 },
      { texto: `El rango es ${ran}`, correcta: 0 },
      { texto: `El punto de corte con X es ${cx}`, correcta: 0 },
      { texto: `El punto de corte con Y es ${cy}`, correcta: 0 },
      { texto: `¿Es función? ${func === 0 ? 'Sí' : 'No'}`, correcta: func }
    ];

    afirmaciones.forEach(af => {
      preguntas.push({
        texto: af.texto,
        opciones: ["V", "F"],
        correcta: af.correcta,
        explicacion: "Afirmación basada en las propiedades calculadas."
      });
    });
  }
  return preguntas;
}

// ------------------------------------------------------------
// INTERFAZ DE USUARIO
// ------------------------------------------------------------
function cargarSelector() {
  let select = document.getElementById('exerciseSelect');
  if (!select) return;
  select.innerHTML = '';
  ejercicios.forEach((_, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Ejercicio #${String(i+1).padStart(2, '0')}`;
    select.appendChild(opt);
  });
}

function cargarEjercicio() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  if (ejercicios.length === 0) return;
  let ex = ejercicios[idx];
  document.getElementById('mathDisplay').innerHTML = `\\( ${ex.latex} \\)`;
  if (window.MathJax) MathJax.typesetPromise();

  let preguntasBase = generarPreguntasParaEjercicio(ex);
  preguntasActuales = preguntasBase.map(p => {
    let opciones = [...p.opciones];
    let correctaOriginal = p.correcta;
    let valorCorrecto = opciones[correctaOriginal];
    // Mezclar opciones
    for (let i = opciones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }
    let nuevoIndiceCorrecto = opciones.indexOf(valorCorrecto);
    return {
      texto: p.texto,
      opciones: opciones,
      correcta: nuevoIndiceCorrecto,
      explicacion: p.explicacion
    };
  });

  renderizarPreguntas();
  respuestasUsuario = new Array(preguntasActuales.length).fill(null);
  document.getElementById('globalResult')?.classList.add('d-none');
  actualizarProgreso(0);

  // Generar la gráfica automáticamente
  generarGrafica();
}

function renderizarPreguntas() {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  container.innerHTML = '';

  preguntasActuales.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'pregunta-item';
    item.id = `pregunta-${idx}`;

    let opcionesHtml = '';
    p.opciones.forEach((opt, oIdx) => {
      opcionesHtml += `
        <div class="form-check">
          <input class="form-check-input" type="radio" name="preg_${idx}" id="radio_${idx}_${oIdx}" value="${oIdx}" onchange="guardarRespuesta(${idx}, ${oIdx})">
          <label class="form-check-label" for="radio_${idx}_${oIdx}">${opt}</label>
        </div>
      `;
    });

    item.innerHTML = `
      <div class="pregunta-numero">Pregunta ${idx + 1}</div>
      <div class="pregunta-enunciado">${p.texto}</div>
      <div class="opciones-list">${opcionesHtml}</div>
      <div id="feedback-${idx}" class="feedback"></div>
    `;
    container.appendChild(item);
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
    let item = document.getElementById(`pregunta-${idx}`);
    if (seleccion === null) {
      feedback.className = 'feedback incorrecto';
      feedback.innerHTML = `<i class="bi bi-x-circle"></i> Sin responder`;
      item.style.borderLeftColor = 'var(--danger)';
    } else if (seleccion === p.correcta) {
      feedback.className = 'feedback correcto';
      feedback.innerHTML = `<i class="bi bi-check-circle"></i> Correcto<div class="explicacion">${p.explicacion}</div>`;
      item.style.borderLeftColor = 'var(--success)';
      correctas++;
    } else {
      feedback.className = 'feedback incorrecto';
      feedback.innerHTML = `<i class="bi bi-x-circle"></i> Incorrecto. La respuesta correcta es: ${p.opciones[p.correcta]}<div class="explicacion">${p.explicacion}</div>`;
      item.style.borderLeftColor = 'var(--danger)';
    }
  });

  let total = preguntasActuales.length;
  let porcentaje = Math.round(correctas / total * 100);
  let globalDiv = document.getElementById('globalResult');
  if (!globalDiv) return;
  globalDiv.className = `alert d-block mt-5 text-center shadow-lg border-0 py-4 ${correctas === total ? 'alert-success' : 'alert-info'}`;
  globalDiv.innerHTML = `<h4>Resultado: ${correctas} / ${total} (${porcentaje}%)</h4><p class="mb-0">Sigue practicando para perfeccionar tu análisis funcional.</p>`;
  globalDiv.classList.remove('d-none');
  actualizarProgreso(correctas);
}

function actualizarProgreso(correctas) {
  let badge = document.getElementById('progressBadge');
  if (badge) badge.innerText = `${correctas} / 50`;
}

function reiniciarTodo() {
  respuestasUsuario.fill(null);
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('[id^="feedback-"]').forEach(el => {
    el.className = 'feedback';
    el.innerHTML = '';
  });
  document.querySelectorAll('.pregunta-item').forEach(item => item.style.borderLeftColor = 'var(--primary)');
  document.getElementById('globalResult')?.classList.add('d-none');
  actualizarProgreso(0);
}

// ------------------------------------------------------------
// FUNCIONES AUXILIARES PARA GRÁFICAS MEJORADAS
// ------------------------------------------------------------
function calcularPuntosNotables(ex) {
  let puntos = [];
  try {
    if (ex.tipo === 'producto') return puntos;
    if (ex.tipo === 'relacion') {
      if (ex.forma === 'circulo') {
        let r = Math.sqrt(ex.r2);
        puntos.push({ x: r, y: 0, label: `(${r.toFixed(2)},0)` });
        puntos.push({ x: -r, y: 0, label: `(${-r.toFixed(2)},0)` });
        puntos.push({ x: 0, y: r, label: `(0,${r.toFixed(2)})` });
        puntos.push({ x: 0, y: -r, label: `(0,${-r.toFixed(2)})` });
      } else if (ex.forma.includes('y2')) {
        let a = ex.forma === 'y2 = x+1' ? -1 : 1;
        puntos.push({ x: a, y: 0, label: `(${a},0)` });
        if (a <= 0) {
          let y = Math.sqrt(-a);
          puntos.push({ x: 0, y: y, label: `(0,${y.toFixed(2)})` });
          puntos.push({ x: 0, y: -y, label: `(0,${-y.toFixed(2)})` });
        }
      }
      return puntos;
    }
    if (ex.tipo === 'sqrt') {
      let x0 = ex.a;
      let y0 = ex.desplazamientoV || 0;
      puntos.push({ x: x0, y: y0, label: `(${x0},${y0})` });
      let rad = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (rad >= 0) {
        let y = Math.sqrt(rad) + y0;
        puntos.push({ x: 0, y: y, label: `(0,${y.toFixed(2)})` });
      }
      return puntos;
    }
    if (ex.tipo === 'lineal') {
      if (ex.m !== 0) {
        let x = -ex.b / ex.m;
        puntos.push({ x: x, y: 0, label: `(${x.toFixed(2)},0)` });
      }
      puntos.push({ x: 0, y: ex.b, label: `(0,${ex.b})` });
      return puntos;
    }
    if (ex.tipo === 'quad') {
      if (ex.h !== undefined) {
        let xv = ex.h;
        let yv = ex.k;
        puntos.push({ x: xv, y: yv, label: `Vértice (${xv.toFixed(2)},${yv.toFixed(2)})` });
        if (ex.a !== 0) {
          let disc = -ex.k / ex.a;
          if (disc > 0) {
            let sqrtDisc = Math.sqrt(disc);
            puntos.push({ x: xv - sqrtDisc, y: 0, label: `(${(xv - sqrtDisc).toFixed(2)},0)` });
            puntos.push({ x: xv + sqrtDisc, y: 0, label: `(${(xv + sqrtDisc).toFixed(2)},0)` });
          } else if (disc === 0) {
            puntos.push({ x: xv, y: 0, label: `(${xv.toFixed(2)},0)` });
          }
        }
        let y0 = ex.a * (0 - ex.h) ** 2 + ex.k;
        puntos.push({ x: 0, y: y0, label: `(0,${y0.toFixed(2)})` });
      } else {
        let a = ex.a, b = ex.b, c = ex.c;
        let xv = -b / (2 * a);
        let yv = a * xv * xv + b * xv + c;
        puntos.push({ x: xv, y: yv, label: `Vértice (${xv.toFixed(2)},${yv.toFixed(2)})` });
        let disc = b * b - 4 * a * c;
        if (disc > 0) {
          let sqrtDisc = Math.sqrt(disc);
          puntos.push({ x: (-b - sqrtDisc) / (2 * a), y: 0, label: `(${((-b - sqrtDisc) / (2 * a)).toFixed(2)},0)` });
          puntos.push({ x: (-b + sqrtDisc) / (2 * a), y: 0, label: `(${((-b + sqrtDisc) / (2 * a)).toFixed(2)},0)` });
        } else if (disc === 0) {
          puntos.push({ x: -b / (2 * a), y: 0, label: `(${(-b / (2 * a)).toFixed(2)},0)` });
        }
        puntos.push({ x: 0, y: c, label: `(0,${c})` });
      }
      return puntos;
    }
    if (ex.tipo === 'exp') {
      let asintota = ex.desplazamientoV || 0;
      let base = ex.base === 'e' ? Math.E : ex.base;
      let y0 = Math.pow(base, -ex.a) + asintota;
      puntos.push({ x: 0, y: y0, label: `(0,${y0.toFixed(2)})` });
      return puntos;
    }
    if (ex.tipo === 'abs') {
      let a = ex.a, h = ex.h, k = ex.k;
      puntos.push({ x: h, y: k, label: `Vértice (${h.toFixed(2)},${k.toFixed(2)})` });
      if (a !== 0) {
        let d = Math.abs(-k / a);
        if (d >= 0) {
          if (k === 0) {
            puntos.push({ x: h, y: 0, label: `(${h.toFixed(2)},0)` });
          } else if (d > 0) {
            puntos.push({ x: h - d, y: 0, label: `(${(h - d).toFixed(2)},0)` });
            puntos.push({ x: h + d, y: 0, label: `(${(h + d).toFixed(2)},0)` });
          }
        }
      }
      let y0 = a * Math.abs(0 - h) + k;
      puntos.push({ x: 0, y: y0, label: `(0,${y0.toFixed(2)})` });
      return puntos;
    }
  } catch (e) {
    console.error("Error calculando puntos notables", e);
  }
  return puntos;
}

/**
 * Calcula un rango dinámico para el eje X basado en puntos notables y el dominio.
 */
function calcularLimitesX(ex, puntosNotables) {
  // Recolectar puntos de interés
  let xs = [];

  // Puntos notables
  puntosNotables.forEach(p => xs.push(p.x));

  // Asegurar que el origen esté considerado
  xs.push(0);

  // Puntos del dominio relevantes
  if (ex.tipo === 'sqrt') {
    xs.push(ex.a);
  }
  if (ex.tipo === 'relacion' && ex.forma === 'circulo') {
    let r = Math.sqrt(ex.r2);
    xs.push(-r, r);
  }
  if (ex.tipo === 'relacion' && ex.forma.includes('y2')) {
    let a = ex.forma === 'y2 = x+1' ? -1 : 1;
    xs.push(a);
  }

  // Filtrar valores no finitos
  xs = xs.filter(x => isFinite(x) && !isNaN(x));

  if (xs.length === 0) {
    return { min: -10, max: 10 };
  }

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);

  // Añadir margen (20% o al menos 2 unidades)
  let padding = Math.max(2, (maxX - minX) * 0.2);
  minX -= padding;
  maxX += padding;

  // Asegurar un ancho mínimo de 10 unidades
  if (maxX - minX < 10) {
    let center = (minX + maxX) / 2;
    minX = center - 5;
    maxX = center + 5;
  }

  // Limitar a un rango sensato para evitar zoom excesivo
  minX = Math.max(-MAX_ABS, minX);
  maxX = Math.min(MAX_ABS, maxX);

  // Redondear para consistencia
  return {
    min: redondear(minX),
    max: redondear(maxX)
  };
}

/**
 * Calcula un rango dinámico para el eje Y basado en los datos de la función.
 */
function calcularLimitesY(dataPrincipal, dataNegativa) {
  let ys = [];
  dataPrincipal.forEach(p => ys.push(p.y));
  dataNegativa.forEach(p => ys.push(p.y));
  
  if (ys.length === 0) return { min: -10, max: 10 };

  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  // Añadir margen (20% o al menos 2 unidades)
  let padding = Math.max(2, (maxY - minY) * 0.2);
  minY -= padding;
  maxY += padding;

  // Asegurar un ancho mínimo de 10 unidades
  if (maxY - minY < 10) {
    let center = (minY + maxY) / 2;
    minY = center - 5;
    maxY = center + 5;
  }

  // Limitar a ±MAX_ABS
  minY = Math.max(-MAX_ABS, minY);
  maxY = Math.min(MAX_ABS, maxY);

  return {
    min: redondear(minY),
    max: redondear(maxY)
  };
}

function generarGrafica() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  if (ejercicios.length === 0) return;
  let ex = ejercicios[idx];
  let canvas = document.getElementById('mainChart');
  if (!canvas) return;
  let ctx = canvas.getContext('2d');

  if (chartInstance) chartInstance.destroy();

  if (ex.tipo === 'producto') {
    alert('Análisis de conjunto: A × B son puntos aislados.');
    return;
  }

  const puntosNotables = calcularPuntosNotables(ex);
  const limitesX = calcularLimitesX(ex, puntosNotables);

  let dataPrincipal = [];
  let dataNegativa = [];

  const pasos = 400;
  const delta = (limitesX.max - limitesX.min) / pasos;

  for (let i = 0; i <= pasos; i++) {
    let x = limitesX.min + i * delta;
    let y = null;
    let yNeg = null;

    try {
      switch (ex.tipo) {
        case 'lineal':
          y = ex.m * x + ex.b;
          break;
        case 'quad':
          y = (ex.h !== undefined)
            ? ex.a * Math.pow(x - ex.h, 2) + ex.k
            : ex.a * x * x + ex.b * x + ex.c;
          break;
        case 'sqrt':
          let argumento = ex.reflexion ? ex.a - x : x - ex.a;
          if (argumento >= 0) y = Math.sqrt(argumento) + (ex.desplazamientoV || 0);
          break;
        case 'abs':
          y = ex.a * Math.abs(x - ex.h) + ex.k;
          break;
        case 'exp':
          let base = ex.base === 'e' ? Math.E : ex.base;
          y = Math.pow(base, x - ex.a) + (ex.desplazamientoV || 0);
          break;
        case 'relacion':
          if (ex.forma === 'circulo') {
            let r = Math.sqrt(ex.r2);
            if (Math.abs(x) <= r) {
              y = Math.sqrt(r * r - x * x);
              yNeg = -Math.sqrt(r * r - x * x);
            }
          } else if (ex.forma.includes('y2')) {
            let val = ex.forma === 'y2 = x+1' ? x + 1 : x - 1;
            if (val >= 0) {
              y = Math.sqrt(val);
              yNeg = -Math.sqrt(val);
            }
          }
          break;
      }
    } catch (e) { y = null; }

    // Solo almacenamos valores finitos (sin límite de Y aquí, se usará para calcular los límites después)
    if (y !== null && isFinite(y)) {
      dataPrincipal.push({ x: redondear(x), y: redondear(y) });
    }
    if (yNeg !== null && isFinite(yNeg)) {
      dataNegativa.push({ x: redondear(x), y: redondear(yNeg) });
    }
  }

  // Calcular límites Y basados en los datos generados
  const limitesY = calcularLimitesY(dataPrincipal, dataNegativa);

  // Filtrar puntos que quedarán fuera del rango Y después de calcular límites
  dataPrincipal = dataPrincipal.filter(p => p.y >= limitesY.min && p.y <= limitesY.max);
  dataNegativa = dataNegativa.filter(p => p.y >= limitesY.min && p.y <= limitesY.max);

  const datasets = [{
    label: 'f(x)',
    data: dataPrincipal,
    borderColor: '#2b6cb0',
    borderWidth: 2,
    pointRadius: 0,
    showLine: true,
    fill: false,
    tension: 0.1
  }];

  if (dataNegativa.length > 0) {
    datasets.push({
      label: 'f(x) inf',
      data: dataNegativa,
      borderColor: '#ed8936',
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      fill: false
    });
  }

  // Puntos notables
  if (puntosNotables.length > 0) {
    const puntosVisibles = puntosNotables
      .filter(p => p.y >= limitesY.min && p.y <= limitesY.max)
      .map(p => ({ x: redondear(p.x), y: redondear(p.y) }));
    if (puntosVisibles.length > 0) {
      datasets.push({
        label: 'Puntos',
        data: puntosVisibles,
        backgroundColor: 'red',
        pointRadius: 5,
        type: 'scatter'
      });
    }
  }

  chartInstance = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: limitesX.min,
          max: limitesX.max,
          grid: {
            color: context => context.tick.value === 0 ? '#000' : '#e5e5e5',
            lineWidth: context => context.tick.value === 0 ? 2 : 1
          },
          title: { display: true, text: 'Eje X' }
        },
        y: {
          type: 'linear',
          min: limitesY.min,
          max: limitesY.max,
          grid: {
            color: context => context.tick.value === 0 ? '#000' : '#e5e5e5',
            lineWidth: context => context.tick.value === 0 ? 2 : 1
          },
          title: { display: true, text: 'Eje Y' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `(${item.parsed.x.toFixed(1)}, ${item.parsed.y.toFixed(1)})`
          }
        }
      }
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
  cargarEjercicios();
  document.getElementById('exerciseSelect').addEventListener('change', cargarEjercicio);
};