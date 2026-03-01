// ------------------------------------------------------------
// CONSTANTES DE CONFIGURACIÓN GLOBAL
// ------------------------------------------------------------
const MAX_ABS = 50;
const PRECISION = 2;

// ------------------------------------------------------------
// VARIABLES GLOBALES
// ------------------------------------------------------------
let ejercicios = [];
let preguntasActuales = [];
let respuestasUsuario = [];
let chartInstance = null;
let ejerciciosCompletados = [];

// ------------------------------------------------------------
// FUNCIÓN DE REDONDEO
// ------------------------------------------------------------
function redondear(num) {
  return parseFloat(num.toFixed(PRECISION));
}

// ------------------------------------------------------------
// FUNCIÓN PARA CONVERTIR A LATEX (sin doble envoltura)
// ------------------------------------------------------------
function toLatex(s) {
  if (typeof s !== 'string') return s;
  // Si ya está envuelto, lo dejamos igual
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s;
  // Reemplazar símbolos Unicode por comandos LaTeX
  let processed = s.replace(/∞/g, '\\infty').replace(/ℝ/g, '\\mathbb{R}');
  // Si contiene caracteres matemáticos, lo envolvemos
  if (/[0-9\(\)\[\]\{\}\,∞\-\+\^=]|\\infty|\\mathbb/.test(processed)) {
    return '\\(' + processed + '\\)';
  }
  return s;
}

// ------------------------------------------------------------
// CARGA DE EJERCICIOS DESDE JSON
// ------------------------------------------------------------
async function cargarEjercicios() {
  try {
    const response = await fetch('ejercicios.json');
    ejercicios = await response.json();
    ejercicios.forEach((ex, idx) => ex.id = idx);
    // Cargar estado de completados desde localStorage
    const stored = localStorage.getItem('completados');
    ejerciciosCompletados = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error cargando ejercicios:', error);
    ejercicios = [];
  }
  cargarSelector();
  cargarEjercicio();
}

function guardarCompletados() {
  localStorage.setItem('completados', JSON.stringify(ejerciciosCompletados));
}

// ------------------------------------------------------------
// FUNCIONES DE CÁLCULO (CORREGIDAS)
// ------------------------------------------------------------
function obtenerCorteX(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma.includes('y2')) {
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          if (derecha.includes('x')) {
            if (derecha.includes('+')) {
              let partes = derecha.split('+');
              let c = partes.find(p => !p.includes('x'));
              if (c) return `(${parseFloat(c)},0)`;
            } else if (derecha.includes('-')) {
              let partes = derecha.split('-');
              if (partes[0].includes('x')) {
                let c = partes[1];
                return `(${parseFloat(c)},0)`;
              } else {
                let c = partes[0];
                return `(${parseFloat(c)},0)`;
              }
            } else {
              if (derecha === 'x') return "(0,0)";
            }
          } else {
            if (parseFloat(derecha) === 0) return "(0,0)";
            return "No hay";
          }
        }
        return "No hay";
      }
      return "No hay";
    }
    if (ex.tipo === 'sqrt') {
      let desp = ex.desplazamientoV || 0;
      if (desp > 0) return "No hay";
      let target = -desp;
      let inner = target * target;
      let x;
      if (ex.reflexion) {
        x = ex.a - inner;
      } else {
        x = ex.a + inner;
      }
      return `(${x.toFixed(1)},0)`;
    }
    if (ex.tipo === 'sqrt_frac') {
      let desp = ex.desplazamientoV || 0;
      if (desp === 0) return "No hay";
      let right = -ex.num / desp;
      if (right <= 0) return "No hay";
      let inner = right * right;
      let x;
      if (ex.reflexion) {
        x = ex.a - inner;
      } else {
        x = ex.a + inner;
      }
      return `(${x.toFixed(1)},0)`;
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
        if (-k / ex.a < 0) return "No hay";
        let sqrtVal = Math.sqrt(-k / ex.a);
        let x1 = ex.h - sqrtVal, x2 = ex.h + sqrtVal;
        return x1 === x2 ? `(${x1.toFixed(1)},0)` : `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
      } else {
        let disc = ex.b * ex.b - 4 * ex.a * ex.c;
        if (disc < 0) return "No hay";
        if (disc === 0) return `(${(-ex.b / (2 * ex.a)).toFixed(1)},0)`;
        let x1 = (-ex.b - Math.sqrt(disc)) / (2 * ex.a);
        let x2 = (-ex.b + Math.sqrt(disc)) / (2 * ex.a);
        return `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
      }
    }
    if (ex.tipo === 'circunferencia') {
      let [h, k] = ex.centro;
      let r = ex.radio;
      let valor = r * r - k * k;
      if (valor < 0) return "No hay";
      if (valor === 0) return `(${h.toFixed(1)},0)`;
      let sqrtVal = Math.sqrt(valor);
      let x1 = h - sqrtVal, x2 = h + sqrtVal;
      return `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
    }
    if (ex.tipo === 'elipse') {
      let [h, k] = ex.centro;
      let a = ex.a, b = ex.b;
      let valor = 1 - (k * k) / (b * b);
      if (valor < 0) return "No hay";
      if (valor === 0) return `(${h.toFixed(1)},0)`;
      let sqrtVal = Math.sqrt(valor * a * a);
      let x1 = h - sqrtVal, x2 = h + sqrtVal;
      return `(${x1.toFixed(1)},0) y (${x2.toFixed(1)},0)`;
    }
    if (ex.tipo === 'racional') {
      let desp = ex.desplazamientoV || 0;
      if (desp === 0) return "No hay";
      let argX = -ex.num / desp;
      let x;
      if (ex.reflexion) {
        x = ex.a - argX;
      } else {
        x = ex.a + argX;
      }
      return `(${x.toFixed(1)},0)`;
    }
    if (ex.tipo === 'exponential') {
      let desp = ex.desplazamientoV || 0;
      if (desp >= 0) return "No hay";
      let target = -desp;
      let x = Math.log(target) / Math.log(ex.base);
      return `(${x.toFixed(1)},0)`;
    }
    return "No disponible";
  } catch {
    return "Error";
  }
}

function obtenerCorteY(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma.includes('y2')) {
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          let valor;
          if (derecha.includes('x')) {
            if (derecha.includes('+')) {
              let partes = derecha.split('+');
              let c = partes.find(p => !p.includes('x'));
              valor = c ? parseFloat(c) : 0;
            } else if (derecha.includes('-')) {
              let partes = derecha.split('-');
              if (partes[0].includes('x')) {
                let c = partes[1];
                valor = -parseFloat(c);
              } else {
                let c = partes[0];
                valor = parseFloat(c);
              }
            } else {
              valor = 0;
            }
          } else {
            valor = parseFloat(derecha);
          }
          if (valor < 0) return "No hay";
          let y = Math.sqrt(valor);
          return `(0, ${y.toFixed(1)}) y (0, -${y.toFixed(1)})`;
        }
        return "No hay";
      }
    }
    if (ex.tipo === 'sqrt') {
      let val = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (val < 0) return "No hay";
      let y = Math.sqrt(val) + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    if (ex.tipo === 'sqrt_frac') {
      let arg = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (arg <= 0) return "No hay";
      let y = ex.num / Math.sqrt(arg) + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    if (ex.tipo === 'lineal') return `(0, ${ex.b})`;
    if (ex.tipo === 'quad') {
      if (ex.h !== undefined) {
        let y = ex.a * (0 - ex.h) ** 2 + ex.k;
        return `(0, ${y.toFixed(1)})`;
      } else return `(0, ${ex.c})`;
    }
    if (ex.tipo === 'circunferencia') {
      let [h, k] = ex.centro;
      let r = ex.radio;
      let valor = r * r - h * h;
      if (valor < 0) return "No hay";
      if (valor === 0) return `(0, ${k.toFixed(1)})`;
      let sqrtVal = Math.sqrt(valor);
      let y1 = k - sqrtVal, y2 = k + sqrtVal;
      return `(0, ${y1.toFixed(1)}) y (0, ${y2.toFixed(1)})`;
    }
    if (ex.tipo === 'elipse') {
      let [h, k] = ex.centro;
      let a = ex.a, b = ex.b;
      let valor = 1 - (h * h) / (a * a);
      if (valor < 0) return "No hay";
      if (valor === 0) return `(0, ${k.toFixed(1)})`;
      let sqrtVal = Math.sqrt(valor * b * b);
      let y1 = k - sqrtVal, y2 = k + sqrtVal;
      return `(0, ${y1.toFixed(1)}) y (0, ${y2.toFixed(1)})`;
    }
    if (ex.tipo === 'racional') {
      let arg = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (arg === 0) return "No hay";
      let y = ex.num / arg + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    if (ex.tipo === 'exponential') {
      let y = 1 + (ex.desplazamientoV || 0);
      return `(0, ${y.toFixed(1)})`;
    }
    return "No disponible";
  } catch {
    return "Error";
  }
}

function obtenerDominio(ex) {
  if (ex.tipo === 'producto') return "Conjunto finito";
  if (ex.tipo === 'sqrt') {
    if (ex.reflexion) return `(-∞, ${ex.a}]`;
    else return `[${ex.a}, ∞)`;
  }
  if (ex.tipo === 'sqrt_frac') {
    if (ex.reflexion) return `(-∞, ${ex.a})`;
    else return `(${ex.a}, ∞)`;
  }
  if (ex.tipo === 'lineal' || ex.tipo === 'quad') return "ℝ";
  if (ex.tipo === 'relacion') {
    if (ex.forma.includes('y2')) {
      let latex = ex.latex;
      let match = latex.match(/y\^2\s*=\s*(.+)/);
      if (match) {
        let derecha = match[1].replace(/\s/g, '');
        if (derecha.includes('x')) {
          if (derecha.includes('+')) {
            let partes = derecha.split('+');
            let c = partes.find(p => !p.includes('x'));
            let limite = c ? -parseFloat(c) : 0;
            return `[${limite.toFixed(1)}, ∞)`;
          } else if (derecha.includes('-')) {
            let partes = derecha.split('-');
            if (partes[0].includes('x')) {
              let c = partes[1];
              return `[${parseFloat(c).toFixed(1)}, ∞)`;
            } else {
              let c = partes[0];
              return `(-∞, ${parseFloat(c).toFixed(1)}]`;
            }
          } else {
            return "[0, ∞)";
          }
        } else {
          return parseFloat(derecha) >= 0 ? "ℝ" : "∅";
        }
      }
      return "ℝ";
    }
  }
  if (ex.tipo === 'circunferencia') {
    let [h, k] = ex.centro;
    let r = ex.radio;
    return `[${(h - r).toFixed(1)}, ${(h + r).toFixed(1)}]`;
  }
  if (ex.tipo === 'elipse') {
    let [h, k] = ex.centro;
    let a = ex.a;
    return `[${(h - a).toFixed(1)}, ${(h + a).toFixed(1)}]`;
  }
  if (ex.tipo === 'racional') {
    return `(-∞, ${ex.a}) ∪ (${ex.a}, ∞)`;
  }
  if (ex.tipo === 'exponential') {
    return "ℝ";
  }
  return "ℝ";
}

function obtenerRango(ex) {
  if (ex.tipo === 'producto') return "Conjunto finito";
  if (ex.tipo === 'sqrt') {
    let minY = ex.desplazamientoV || 0;
    return `[${minY.toFixed(1)}, ∞)`;
  }
  if (ex.tipo === 'sqrt_frac') {
    let desp = ex.desplazamientoV || 0;
    if (ex.num > 0) {
      return `(${desp.toFixed(1)}, ∞)`;
    } else {
      return `(-∞, ${desp.toFixed(1)})`;
    }
  }
  if (ex.tipo === 'lineal') {
    if (ex.m === 0) return `{${ex.b}}`;
    return "ℝ";
  }
  if (ex.tipo === 'quad') {
    if (ex.h !== undefined) {
      return ex.a > 0 ? `[${ex.k.toFixed(1)}, ∞)` : `(-∞, ${ex.k.toFixed(1)}]`;
    } else {
      let verticeY = ex.c - (ex.b * ex.b) / (4 * ex.a);
      return ex.a > 0 ? `[${verticeY.toFixed(1)}, ∞)` : `(-∞, ${verticeY.toFixed(1)}]`;
    }
  }
  if (ex.tipo === 'relacion') {
    if (ex.forma.includes('y2')) {
      return "[0, ∞)";
    }
  }
  if (ex.tipo === 'circunferencia') {
    let [h, k] = ex.centro;
    let r = ex.radio;
    return `[${(k - r).toFixed(1)}, ${(k + r).toFixed(1)}]`;
  }
  if (ex.tipo === 'elipse') {
    let [h, k] = ex.centro;
    let b = ex.b;
    return `[${(k - b).toFixed(1)}, ${(k + b).toFixed(1)}]`;
  }
  if (ex.tipo === 'racional') {
    let desp = ex.desplazamientoV || 0;
    return `(-∞, ${desp}) ∪ (${desp}, ∞)`;
  }
  if (ex.tipo === 'exponential') {
    let desp = ex.desplazamientoV || 0;
    return `(${desp.toFixed(1)}, ∞)`;
  }
  return "ℝ";
}

function esFuncion(ex) {
  if (ex.tipo === 'relacion' && ex.forma.includes('y2')) return 1;
  if (ex.tipo === 'producto') return 1;
  if (ex.tipo === 'circunferencia' || ex.tipo === 'elipse') return 1;
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

function obtenerCentro(ex) {
  if (ex.tipo === 'circunferencia' || ex.tipo === 'elipse') {
    return `(${ex.centro[0].toFixed(1)}, ${ex.centro[1].toFixed(1)})`;
  }
  return null;
}

function obtenerRadioSemiejes(ex) {
  if (ex.tipo === 'circunferencia') {
    return `Radio = ${ex.radio}`;
  }
  if (ex.tipo === 'elipse') {
    return `a = ${ex.a}, b = ${ex.b}`;
  }
  return null;
}

function obtenerAsintotaVertical(ex) {
  if (ex.tipo === 'racional' || ex.tipo === 'sqrt_frac') {
    return `x = ${ex.a}`;
  }
  return null;
}

function obtenerDiscriminante(ex) {
  if (ex.tipo === 'quad') {
    if (ex.h !== undefined) {
      let a = ex.a;
      let b = -2 * a * ex.h;
      let c = a * ex.h * ex.h + ex.k;
      return b * b - 4 * a * c;
    } else {
      return ex.b * ex.b - 4 * ex.a * ex.c;
    }
  }
  return null;
}

// ------------------------------------------------------------
// FUNCIONES PARA PREGUNTAS CONCEPTUALES
// ------------------------------------------------------------
function obtenerExpresionDerecha(ex) {
  return ex.latex.replace(/^y\s*=\s*/, '');
}

function obtenerRepresentacionComprension(ex) {
  if (ex.tipo === 'producto') return null;
  let dom = obtenerDominio(ex);
  let ran = obtenerRango(ex);
  let expr = obtenerExpresionDerecha(ex);
  return `\\(F = \\{(x, y) : y = ${expr}, x \\in ${dom}, y \\in ${ran}\\}\\)`;
}

function puntoPertenece(ex, x, y) {
  try {
    switch (ex.tipo) {
      case 'lineal':
        return Math.abs(ex.m * x + ex.b - y) < 0.001;
      case 'quad':
        let yCalc = (ex.h !== undefined) ? ex.a * Math.pow(x - ex.h, 2) + ex.k : ex.a * x * x + ex.b * x + ex.c;
        return Math.abs(yCalc - y) < 0.001;
      case 'sqrt':
        let arg = ex.reflexion ? ex.a - x : x - ex.a;
        if (arg < 0) return false;
        let yCalcSqrt = Math.sqrt(arg) + (ex.desplazamientoV || 0);
        return Math.abs(yCalcSqrt - y) < 0.001;
      case 'sqrt_frac':
        let argF = ex.reflexion ? ex.a - x : x - ex.a;
        if (argF <= 0) return false;
        let yCalcFrac = ex.num / Math.sqrt(argF) + (ex.desplazamientoV || 0);
        return Math.abs(yCalcFrac - y) < 0.001;
      case 'relacion':
        if (ex.forma.includes('y2')) {
          let latex = ex.latex;
          let match = latex.match(/y\^2\s*=\s*(.+)/);
          if (match) {
            let derecha = match[1].replace(/\s/g, '');
            let valor;
            if (derecha.includes('x')) {
              if (derecha.includes('+')) {
                let partes = derecha.split('+');
                let c = partes.find(p => !p.includes('x'));
                valor = x + (c ? parseFloat(c) : 0);
              } else if (derecha.includes('-')) {
                let partes = derecha.split('-');
                if (partes[0].includes('x')) {
                  let c = partes[1];
                  valor = x - parseFloat(c);
                } else {
                  let c = partes[0];
                  valor = parseFloat(c) - x;
                }
              } else {
                valor = x;
              }
            } else {
              valor = parseFloat(derecha);
            }
            return Math.abs(y * y - valor) < 0.001;
          }
        }
        return false;
      case 'circunferencia':
        let [h, k] = ex.centro;
        return Math.abs((x - h) ** 2 + (y - k) ** 2 - ex.radio ** 2) < 0.001;
      case 'elipse':
        let [h2, k2] = ex.centro;
        return Math.abs(((x - h2) ** 2) / (ex.a ** 2) + ((y - k2) ** 2) / (ex.b ** 2) - 1) < 0.001;
      case 'racional':
        let argR = ex.reflexion ? ex.a - x : x - ex.a;
        if (Math.abs(argR) < 1e-10) return false;
        let yCalcR = ex.num / argR + (ex.desplazamientoV || 0);
        return Math.abs(yCalcR - y) < 0.001;
      case 'exponential':
        let yCalcE = Math.pow(ex.base, x) + (ex.desplazamientoV || 0);
        return Math.abs(yCalcE - y) < 0.001;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function esCreciente(ex) {
  if (ex.tipo === 'lineal') return ex.m > 0;
  if (ex.tipo === 'sqrt') return !ex.reflexion;
  if (ex.tipo === 'sqrt_frac') {
    return ex.reflexion;
  }
  if (ex.tipo === 'exponential') return ex.base > 1;
  return null;
}

function tieneMaximo(ex) {
  if (ex.tipo === 'quad') return ex.a < 0;
  return false;
}

function tieneMinimo(ex) {
  if (ex.tipo === 'quad') return ex.a > 0;
  return false;
}

// ------------------------------------------------------------
// FUNCIÓN PARA NORMALIZAR OPCIONES (MEJORADA)
// ------------------------------------------------------------
function normalizarOpcion(opt) {
  if (typeof opt !== 'string') return String(opt);
  // Quitar posibles delimitadores LaTeX
  let raw = opt.replace(/^\\\(|\\\)$/g, '');
  // Normalizar puntos (x,y)
  let puntoMatch = raw.match(/^\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?$/);
  if (puntoMatch) {
    let x = parseFloat(puntoMatch[1]);
    let y = parseFloat(puntoMatch[2]);
    x = Math.round(x * 10) / 10;
    y = Math.round(y * 10) / 10;
    let xStr = x % 1 === 0 ? x.toString() : x.toFixed(1);
    let yStr = y % 1 === 0 ? y.toString() : y.toFixed(1);
    return `(${xStr}, ${yStr})`;
  }
  // Normalizar intervalos con posibles infinitos
  let intervaloInfMatch = raw.match(/^([\[\(])\s*(-?(?:\d+\.?\d*|∞))\s*,\s*(-?(?:\d+\.?\d*|∞))\s*([\]\)])$/);
  if (intervaloInfMatch) {
    let left = intervaloInfMatch[1];
    let inf1 = intervaloInfMatch[2];
    let inf2 = intervaloInfMatch[3];
    let right = intervaloInfMatch[4];
    // Procesar si son números para redondear
    if (!isNaN(parseFloat(inf1))) {
      let num = parseFloat(inf1);
      num = Math.round(num * 10) / 10;
      inf1 = num % 1 === 0 ? num.toString() : num.toFixed(1);
    }
    if (!isNaN(parseFloat(inf2))) {
      let num = parseFloat(inf2);
      num = Math.round(num * 10) / 10;
      inf2 = num % 1 === 0 ? num.toString() : num.toFixed(1);
    }
    return `${left}${inf1},${inf2}${right}`;
  }
  // Normalizar números sueltos
  if (!isNaN(parseFloat(raw)) && isFinite(raw)) {
    let num = parseFloat(raw);
    num = Math.round(num * 10) / 10;
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  }
  return raw;
}

// ------------------------------------------------------------
// GENERAR PREGUNTAS (con opciones únicas y explicaciones con LaTeX)
// ------------------------------------------------------------
function generarPreguntasParaEjercicio(ex) {
  let preguntas = [];

  function crearOpciones(baseOptions, correctValue) {
    let normalizedCorrect = normalizarOpcion(correctValue);
    let uniqueMap = new Map();
    baseOptions.forEach(opt => {
      let norm = normalizarOpcion(opt);
      if (!uniqueMap.has(norm)) {
        uniqueMap.set(norm, opt);
      }
    });
    let opciones = Array.from(uniqueMap.values());
    let correctIndex = opciones.findIndex(opt => normalizarOpcion(opt) === normalizedCorrect);
    return { opciones, correcta: correctIndex };
  }

  if (ex.tipo === 'producto') {
    // Bloque envuelto en try-catch para capturar errores y evitar fallos silenciosos
    try {
      let A = ex.A, B = ex.B;
      let producto = [];
      A.forEach(a => B.forEach(b => producto.push(`(${a},${b})`)));

      // Cardinalidad de A × B
      let base1 = [String(A.length * B.length), "|A|+|B|", "|A|", "|B|"];
      let { opciones: op1, correcta: corr1 } = crearOpciones(base1, String(A.length * B.length));
      preguntas.push({
        texto: "Cardinalidad de A × B",
        opciones: op1,
        correcta: corr1,
        explicacion: `A tiene ${A.length} elementos, B tiene ${B.length}. |A×B| = ${A.length} × ${B.length} = ${A.length * B.length}.`
      });

      // Par sí
      let parSi = producto[0];
      let base2 = ["Sí", "No"];
      let { opciones: op2, correcta: corr2 } = crearOpciones(base2, "Sí");
      preguntas.push({
        texto: `¿El par ${parSi} pertenece a A × B?`,
        opciones: op2,
        correcta: corr2,
        explicacion: `Sí, porque se forma con un elemento de A y otro de B.`
      });

      // B × A (sí)
      let b0 = B[0], a0 = A[0];
      let base3 = ["Sí", "No"];
      let { opciones: op3, correcta: corr3 } = crearOpciones(base3, "Sí");
      preguntas.push({
        texto: `¿El par (${b0}, ${a0}) pertenece a B × A?`,
        opciones: op3,
        correcta: corr3,
        explicacion: `Sí, porque ${b0} ∈ B y ${a0} ∈ A.`
      });

      // Par que no pertenece a B × A
      let maxA = Math.max(...A);
      let noA = maxA + 1;
      let parNoBA = `(${b0}, ${noA})`;
      let base4 = ["Sí", "No"];
      let { opciones: op4, correcta: corr4 } = crearOpciones(base4, "No");
      preguntas.push({
        texto: `¿El par ${parNoBA} pertenece a B × A?`,
        opciones: op4,
        correcta: corr4,
        explicacion: `No, porque ${noA} no pertenece a A (A = {${A.join(', ')}}).`
      });

      // A ⊆ B
      let aSubB = A.every(val => B.includes(val));
      let base5 = ["Sí", "No"];
      let { opciones: op5, correcta: corr5 } = crearOpciones(base5, aSubB ? "Sí" : "No");
      preguntas.push({
        texto: "¿A ⊆ B?",
        opciones: op5,
        correcta: corr5,
        explicacion: aSubB ? "Todos los elementos de A están en B." : "Hay elementos de A que no están en B."
      });

      // A × B igual a B × A
      let igual = (A.length === B.length) && A.every(v => B.includes(v)) && B.every(v => A.includes(v));
      let base6 = ["V", "F"];
      let { opciones: op6, correcta: corr6 } = crearOpciones(base6, igual ? "V" : "F");
      preguntas.push({
        texto: "A × B es igual a B × A",
        opciones: op6,
        correcta: corr6,
        explicacion: igual ? "Los conjuntos son iguales porque A = B." : "El producto cartesiano no es conmutativo, salvo que A = B."
      });

      // Representa función
      let esFunc = (B.length === 1);
      let base7 = ["V", "F"];
      let { opciones: op7, correcta: corr7 } = crearOpciones(base7, esFunc ? "V" : "F");
      preguntas.push({
        texto: "A × B representa una función de A en B",
        opciones: op7,
        correcta: corr7,
        explicacion: esFunc ? "Cada elemento de A se relaciona con un único elemento de B." : "Cada elemento de A se relaciona con varios elementos de B, por lo que no es función."
      });

      // Cardinalidad de A
      let base8 = [String(A.length), String(B.length), String(A.length + B.length), String(A.length * B.length)];
      let { opciones: op8, correcta: corr8 } = crearOpciones(base8, String(A.length));
      preguntas.push({
        texto: "Cardinalidad del conjunto A",
        opciones: op8,
        correcta: corr8,
        explicacion: `A tiene ${A.length} elementos.`
      });
    } catch (e) {
      console.error("Error generando preguntas para producto:", e);
    }

  } else {
    let cx = obtenerCorteX(ex);
    let cy = obtenerCorteY(ex);
    let dom = obtenerDominio(ex);
    let ran = obtenerRango(ex);
    let func = esFuncion(ex);
    let vertice = obtenerVertice(ex);
    let centro = obtenerCentro(ex);
    let radioSemiejes = obtenerRadioSemiejes(ex);
    let asintota = obtenerAsintotaVertical(ex);
    let discriminante = obtenerDiscriminante(ex);

    // Pregunta 1: Corte con X
    let opcionesX = [cx, "(0,0)", "No hay", "(1,0)"];
    let { opciones: opX, correcta: corrX } = crearOpciones(opcionesX, cx);
    preguntas.push({
      texto: "Punto de corte con eje X",
      opciones: opX,
      correcta: corrX,
      explicacion: `Para hallar corte con X, hacemos y=0. Resolviendo se obtiene: \\(${cx}\\).`
    });

    // Pregunta 2: Corte con Y
    let opcionesY = [cy, "(0,0)", "No hay", "(0,1)"];
    let { opciones: opY, correcta: corrY } = crearOpciones(opcionesY, cy);
    preguntas.push({
      texto: "Punto de corte con eje Y",
      opciones: opY,
      correcta: corrY,
      explicacion: `Para hallar corte con Y, hacemos x=0. Se obtiene: \\(${cy}\\).`
    });

    // Pregunta 3: Dominio
    let opcionesDom = [dom, "ℝ", "[0,∞)", "(-∞,0]"];
    let { opciones: opDom, correcta: corrDom } = crearOpciones(opcionesDom, dom);
    preguntas.push({
      texto: "Dominio (intervalo)",
      opciones: opDom,
      correcta: corrDom,
      explicacion: `El dominio es \\(${dom}\\).`
    });

    // Pregunta 4: Rango
    let opcionesRan = [ran, "ℝ", "[0,∞)", "(-∞,0]"];
    let { opciones: opRan, correcta: corrRan } = crearOpciones(opcionesRan, ran);
    preguntas.push({
      texto: "Rango (intervalo)",
      opciones: opRan,
      correcta: corrRan,
      explicacion: `El rango es \\(${ran}\\).`
    });

    // Pregunta 5: ¿Es función?
    let base5 = ["Sí", "No"];
    let { opciones: op5, correcta: corr5 } = crearOpciones(base5, func === 0 ? "Sí" : "No");
    preguntas.push({
      texto: "¿Representa una función?",
      opciones: op5,
      correcta: corr5,
      explicacion: func === 0 ? "Cada x tiene una única imagen." : "Hay valores de x con dos imágenes posibles."
    });

    // Pregunta 6: Vértice (solo para cuadráticas)
    if (vertice) {
      let opcionesVert = [vertice, "(0,0)", "No tiene vértice", "(1,1)"];
      let { opciones: opVert, correcta: corrVert } = crearOpciones(opcionesVert, vertice);
      preguntas.push({
        texto: "Coordenadas del vértice",
        opciones: opVert,
        correcta: corrVert,
        explicacion: `El vértice es \\(${vertice}\\).`
      });
    }

    // Pregunta 7: Asíntota vertical (para racionales y sqrt_frac)
    if (asintota) {
      let opcionesAsint = [asintota, "x = 0", "y = 0", "No tiene"];
      let { opciones: opAsint, correcta: corrAsint } = crearOpciones(opcionesAsint, asintota);
      preguntas.push({
        texto: "Ecuación de la asíntota vertical",
        opciones: opAsint,
        correcta: corrAsint,
        explicacion: `La asíntota vertical está en \\(${asintota}\\).`
      });
    }

    // Pregunta 8: Discriminante (solo para cuadráticas)
    if (discriminante !== null) {
      let discVal = discriminante.toFixed(1);
      let opcionesDisc = [discVal, "0", "1", "-1"];
      let { opciones: opDisc, correcta: corrDisc } = crearOpciones(opcionesDisc, discVal);
      let regla = discriminante > 0 ? "dos raíces reales distintas" : (discriminante === 0 ? "una raíz real doble" : "no tiene raíces reales");
      preguntas.push({
        texto: "Valor del discriminante",
        opciones: opDisc,
        correcta: corrDisc,
        explicacion: `\\(\\Delta = ${discVal}\\). Como \\(\\Delta ${discriminante > 0 ? '>' : (discriminante === 0 ? '=' : '<')} 0\\), la ecuación tiene ${regla}.`
      });
    }

    // Pregunta 9: Centro (para circunferencia/elipse)
    if (centro) {
      let opcionesCentro = [centro, "(0,0)", "No tiene centro", "(1,1)"];
      let { opciones: opCentro, correcta: corrCentro } = crearOpciones(opcionesCentro, centro);
      preguntas.push({
        texto: "Coordenadas del centro",
        opciones: opCentro,
        correcta: corrCentro,
        explicacion: `El centro es \\(${centro}\\).`
      });
    }

    // Pregunta 10: Radio/Semiejes (para circunferencia/elipse)
    if (radioSemiejes) {
      let opcionesRadio = [radioSemiejes, "Radio = 1", "a=1, b=1", "No aplica"];
      let { opciones: opRadio, correcta: corrRadio } = crearOpciones(opcionesRadio, radioSemiejes);
      preguntas.push({
        texto: ex.tipo === 'circunferencia' ? "Radio" : "Semiejes",
        opciones: opRadio,
        correcta: corrRadio,
        explicacion: `${ex.tipo === 'circunferencia' ? 'El radio es' : 'Los semiejes son'} \\(${radioSemiejes}\\).`
      });
    }

    // Pregunta 11: Representación por comprensión (si aplica)
    let repr = obtenerRepresentacionComprension(ex);
    if (repr && ex.tipo !== 'circunferencia' && ex.tipo !== 'elipse') {
      let domErr = dom === "ℝ" ? "[0,∞)" : "ℝ";
      let ranErr = ran === "ℝ" ? "[0,∞)" : "ℝ";
      let expr = obtenerExpresionDerecha(ex);
      let opcionesRepr = [
        repr,
        `\\(F = \\{(x, y) : y = ${expr}, x \\in ${domErr}, y \\in ${ran}\\}\\)`,
        `\\(F = \\{(x, y) : y = ${expr}, x \\in ${dom}, y \\in ${ranErr}\\}\\)`,
        `\\(F = \\{(x, y) : x = ${expr}, y \\in ${dom}, x \\in ${ran}\\}\\)`
      ];
      let { opciones: opRepr, correcta: corrRepr } = crearOpciones(opcionesRepr, repr);
      preguntas.push({
        texto: "Selecciona la representación por comprensión correcta de la función:",
        opciones: opRepr,
        correcta: corrRepr,
        explicacion: "La notación correcta debe incluir la ecuación y el dominio y rango adecuados."
      });
    }

    // Pregunta 12: Punto notable
    let puntoNotable = null;
    if (ex.tipo === 'lineal') puntoNotable = { x: 0, y: ex.b };
    else if (ex.tipo === 'quad' && vertice) {
      let coords = vertice.replace(/[()]/g, '').split(',').map(Number);
      puntoNotable = { x: coords[0], y: coords[1] };
    } else if (ex.tipo === 'sqrt') puntoNotable = { x: ex.a, y: ex.desplazamientoV || 0 };
    else if (ex.tipo === 'sqrt_frac') {
      let xVal = ex.reflexion ? ex.a - 1 : ex.a + 1;
      let yVal = ex.num / Math.sqrt(1) + (ex.desplazamientoV || 0);
      puntoNotable = { x: xVal, y: yVal };
    } else if (ex.tipo === 'racional') {
      let xVal = ex.reflexion ? ex.a - 1 : ex.a + 1;
      let yVal = ex.num / 1 + (ex.desplazamientoV || 0);
      puntoNotable = { x: xVal, y: yVal };
    } else if (ex.tipo === 'circunferencia' || ex.tipo === 'elipse') {
      puntoNotable = { x: ex.centro[0] + (ex.tipo === 'circunferencia' ? ex.radio : ex.a), y: ex.centro[1] };
    } else if (ex.tipo === 'exponential') {
      puntoNotable = { x: 0, y: 1 + (ex.desplazamientoV || 0) };
    }
    if (puntoNotable) {
      let base12 = ["Sí", "No"];
      let { opciones: op12, correcta: corr12 } = crearOpciones(base12, "Sí");
      preguntas.push({
        texto: `¿El punto \\((${puntoNotable.x.toFixed(1)}, ${puntoNotable.y.toFixed(1)})\\) pertenece a la función?`,
        opciones: op12,
        correcta: corr12,
        explicacion: "Sí, porque satisface la ecuación."
      });
    }

    // Pregunta 13: Punto falso (dinámico)
    let puntoFalso = generarPuntoFalso(ex);
    let base13 = ["Sí", "No"];
    let { opciones: op13, correcta: corr13 } = crearOpciones(base13, "No");
    preguntas.push({
      texto: `¿El punto \\(${puntoFalso.str}\\) pertenece a la función?`,
      opciones: op13,
      correcta: corr13,
      explicacion: "No, porque no satisface la ecuación."
    });

    // Pregunta 14: Máximo/mínimo (solo cuadráticas)
    if (tieneMaximo(ex)) {
      let base14 = ["V", "F"];
      let { opciones: op14, correcta: corr14 } = crearOpciones(base14, "V");
      preguntas.push({
        texto: "La función tiene un máximo",
        opciones: op14,
        correcta: corr14,
        explicacion: "El coeficiente principal es negativo, por lo que la parábola abre hacia abajo y tiene un máximo en el vértice."
      });
    } else if (tieneMinimo(ex)) {
      let base14 = ["V", "F"];
      let { opciones: op14, correcta: corr14 } = crearOpciones(base14, "V");
      preguntas.push({
        texto: "La función tiene un mínimo",
        opciones: op14,
        correcta: corr14,
        explicacion: "El coeficiente principal es positivo, por lo que tiene un mínimo."
      });
    }

    // Pregunta 15: Monotonía (para lineales, sqrt, exponencial)
    let crec = esCreciente(ex);
    if (crec !== null) {
      let base15 = ["V", "F"];
      let { opciones: op15, correcta: corr15 } = crearOpciones(base15, crec ? "V" : "F");
      preguntas.push({
        texto: "La función es creciente en todo su dominio",
        opciones: op15,
        correcta: corr15,
        explicacion: crec ? "La pendiente es positiva (o la función es creciente)." : "La función es decreciente."
      });
    }

    // Pregunta 16: Comparación con relación (solo para sqrt)
    if (ex.tipo === 'sqrt') {
      let expr = obtenerExpresionDerecha(ex).replace(/\\sqrt/g, '');
      let base16 = ["Sí", "No"];
      let { opciones: op16, correcta: corr16 } = crearOpciones(base16, "No");
      preguntas.push({
        texto: `¿La ecuación \\(y^2 = ${expr}\\) es equivalente a la función?`,
        opciones: op16,
        correcta: corr16,
        explicacion: "No, porque \\(y^2 = ...\\) representa dos ramas, mientras que la función raíz cuadrada da solo la rama positiva."
      });
    }

    // Pregunta 17: Pertenencia al dominio
    let xTest = -2;
    let perteneceDom = dom.includes('ℝ') || (dom.includes('[') && xTest >= parseFloat(dom.split(',')[0].replace('[', ''))) || (dom.includes(']') && xTest <= parseFloat(dom.split(',')[1].replace(']', ''))) || (dom.includes('(') && xTest > parseFloat(dom.split(',')[0].replace('(', ''))) || (dom.includes(')') && xTest < parseFloat(dom.split(',')[1].replace(')', '')));
    let base17 = ["Sí", "No"];
    let { opciones: op17, correcta: corr17 } = crearOpciones(base17, perteneceDom ? "Sí" : "No");
    preguntas.push({
      texto: `¿El valor \\(x = ${xTest}\\) pertenece al dominio?`,
      opciones: op17,
      correcta: corr17,
      explicacion: `El dominio es \\(${dom}\\), por lo tanto ${perteneceDom ? 'sí' : 'no'} pertenece.`
    });

    // Pregunta 18: Pertenencia al rango
    let yTest = 0;
    let perteneceRan = ran.includes('ℝ') || (ran.includes('[') && yTest >= parseFloat(ran.split(',')[0].replace('[', ''))) || (ran.includes(']') && yTest <= parseFloat(ran.split(',')[1].replace(']', ''))) || (ran.includes('(') && yTest > parseFloat(ran.split(',')[0].replace('(', ''))) || (ran.includes(')') && yTest < parseFloat(ran.split(',')[1].replace(')', '')));
    let base18 = ["Sí", "No"];
    let { opciones: op18, correcta: corr18 } = crearOpciones(base18, perteneceRan ? "Sí" : "No");
    preguntas.push({
      texto: `¿El valor \\(y = ${yTest}\\) pertenece al rango?`,
      opciones: op18,
      correcta: corr18,
      explicacion: `El rango es \\(${ran}\\), por lo tanto ${perteneceRan ? 'sí' : 'no'} pertenece.`
    });

    // Preguntas extra para tipos que resulten impares después de lo anterior
    if (ex.tipo === 'circunferencia' || ex.tipo === 'elipse') {
      let simX = (ex.centro[1] === 0);
      let base19 = ["Sí", "No"];
      let { opciones: op19, correcta: corr19 } = crearOpciones(base19, simX ? "Sí" : "No");
      preguntas.push({
        texto: "¿La curva es simétrica respecto al eje X?",
        opciones: op19,
        correcta: corr19,
        explicacion: simX ? "Sí, porque el centro está sobre el eje X." : "No, porque el centro no está sobre el eje X."
      });
    }

    if (ex.tipo === 'exponential') {
      let base20 = ["Sí", "No"];
      let { opciones: op20, correcta: corr20 } = crearOpciones(base20, "No");
      preguntas.push({
        texto: "¿La función tiene un máximo o mínimo?",
        opciones: op20,
        correcta: corr20,
        explicacion: "Las funciones exponenciales son monótonas y no tienen máximos ni mínimos locales."
      });
    }
  }

  return preguntas;
}

// ------------------------------------------------------------
// GENERAR UN PUNTO FALSO QUE NO PERTENEZCA A LA FUNCIÓN
// ------------------------------------------------------------
function generarPuntoFalso(ex) {
  // Lista de candidatos comunes
  const candidatos = [
    [0,0], [1,1], [2,2], [3,3], [4,4], [5,5],
    [-1,-1], [0,1], [1,0], [-2,-2], [2,-2], [-2,2],
    [0,5], [5,0], [-5,-5], [10,10]
  ];
  for (let [x, y] of candidatos) {
    if (!puntoPertenece(ex, x, y)) {
      return { x, y, str: `(${x.toFixed(1)}, ${y.toFixed(1)})` };
    }
  }
  // Fallback: puntos aleatorios
  for (let intento = 0; intento < 100; intento++) {
    let x = Math.round((Math.random() * 20 - 10) * 10) / 10;
    let y = Math.round((Math.random() * 20 - 10) * 10) / 10;
    if (!puntoPertenece(ex, x, y)) {
      return { x, y, str: `(${x.toFixed(1)}, ${y.toFixed(1)})` };
    }
  }
  // Último recurso
  return { x: 99, y: 99, str: "(99.0, 99.0)" };
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
    opt.textContent = `Ejercicio #${String(i + 1).padStart(2, '0')}`;
    select.appendChild(opt);
  });
}

function cargarEjercicio() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  if (ejercicios.length === 0) return;
  let ex = ejercicios[idx];
  document.getElementById('mathDisplay').innerHTML = `\\( ${ex.latex} \\)`;
  if (window.MathJax) MathJax.typesetPromise();

  let chartContainer = document.querySelector('.chart-container');
  if (ex.graficable) {
    chartContainer.style.display = 'block';
    generarGrafica();
  } else {
    chartContainer.style.display = 'none';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

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
      texto: p.texto,
      opciones: opciones,
      correcta: nuevoIndiceCorrecto,
      explicacion: p.explicacion
    };
  });

  renderizarPreguntas();
  if (window.MathJax) MathJax.typesetPromise();
  respuestasUsuario = new Array(preguntasActuales.length).fill(null);
  document.getElementById('globalResult')?.classList.add('d-none');
  actualizarProgreso(0);

  // Actualizar estado de completado
  const completado = ejerciciosCompletados.includes(idx);
  const completedBadge = document.getElementById('completedBadge');
  if (completedBadge) {
    completedBadge.style.display = completado ? 'inline-block' : 'none';
  }

  // Deshabilitar elementos si está completado (excepto el botón reiniciar)
  const radios = document.querySelectorAll('input[type="radio"]');
  const btnVerify = document.querySelectorAll('.btn-success[onclick="verificarTodo()"]');
  if (completado) {
    radios.forEach(r => r.disabled = true);
    btnVerify.forEach(b => b.disabled = true);
  } else {
    radios.forEach(r => r.disabled = false);
    btnVerify.forEach(b => b.disabled = false);
  }
  // El botón reiniciar siempre está habilitado

  actualizarBotonesNavegacion();
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
      let displayOpt = toLatex(opt);
      opcionesHtml += `
        <div class="form-check">
          <input class="form-check-input" type="radio" name="preg_${idx}" id="radio_${idx}_${oIdx}" value="${oIdx}" onchange="guardarRespuesta(${idx}, ${oIdx})">
          <label class="form-check-label" for="radio_${idx}_${oIdx}">${displayOpt}</label>
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

window.guardarRespuesta = function (idx, valor) {
  respuestasUsuario[idx] = valor;
};

function verificarTodo() {
  let correctas = 0;
  preguntasActuales.forEach((p, idx) => {
    let seleccion = respuestasUsuario[idx];
    let feedback = document.getElementById(`feedback-${idx}`);
    let item = document.getElementById(`pregunta-${idx}`);

    // Verificar que los elementos existan para evitar errores
    if (!feedback || !item) {
      console.error(`No se encontró el elemento de retroalimentación para la pregunta ${idx}`);
      return;
    }

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
      feedback.innerHTML = `<i class="bi bi-x-circle"></i> Incorrecto. La respuesta correcta es: ${toLatex(p.opciones[p.correcta])}<div class="explicacion">${p.explicacion}</div>`;
      item.style.borderLeftColor = 'var(--danger)';
    }
  });

  if (window.MathJax) {
    MathJax.typesetPromise();
  }

  let total = preguntasActuales.length;
  let porcentaje = Math.round((correctas / total) * 100);
  let globalDiv = document.getElementById('globalResult');
  if (!globalDiv) return;
  globalDiv.className = `alert d-block mt-5 text-center shadow-lg border-0 py-4 ${correctas === total ? 'alert-success' : 'alert-info'}`;
  globalDiv.innerHTML = `<h4>Resultado: ${correctas} / ${total} (${porcentaje}%)</h4><p class="mb-0">Sigue practicando para perfeccionar tu análisis funcional.</p>`;
  globalDiv.classList.remove('d-none');

  // Si todas son correctas, marcar ejercicio como completado
  let idx = parseInt(document.getElementById('exerciseSelect').value);
  if (correctas === total && !ejerciciosCompletados.includes(idx)) {
    ejerciciosCompletados.push(idx);
    guardarCompletados();
    cargarEjercicio(); // recarga para aplicar deshabilitados
  }

  actualizarProgreso(correctas);
}

function actualizarProgreso(correctas) {
  let badge = document.getElementById('progressBadge');
  if (badge) badge.innerText = `${correctas} / 50`;
}

function reiniciarTodo() {
  let idx = parseInt(document.getElementById('exerciseSelect').value);
  // Quitar el ejercicio de completados si lo está
  const indexInCompletados = ejerciciosCompletados.indexOf(idx);
  if (indexInCompletados !== -1) {
    ejerciciosCompletados.splice(indexInCompletados, 1);
    guardarCompletados();
  }
  // Recargar el ejercicio para reiniciar todo
  cargarEjercicio();
}

function actualizarBotonesNavegacion() {
  let idx = parseInt(document.getElementById('exerciseSelect').value);
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (btnPrev) btnPrev.disabled = idx === 0;
  if (btnNext) btnNext.disabled = idx === ejercicios.length - 1;
}

function ejercicioAnterior() {
  let select = document.getElementById('exerciseSelect');
  let idx = parseInt(select.value);
  if (idx > 0) {
    select.value = idx - 1;
    cargarEjercicio();
  }
}

function ejercicioSiguiente() {
  let select = document.getElementById('exerciseSelect');
  let idx = parseInt(select.value);
  if (idx < ejercicios.length - 1) {
    select.value = idx + 1;
    cargarEjercicio();
  }
}

// ------------------------------------------------------------
// FUNCIONES AUXILIARES PARA GRÁFICAS
// ------------------------------------------------------------
function calcularPuntosNotables(ex) {
  let puntos = [];
  try {
    if (ex.tipo === 'producto') return puntos;
    if (ex.tipo === 'relacion') {
      if (ex.forma.includes('y2')) {
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          if (derecha.includes('x')) {
            if (derecha.includes('+')) {
              let partes = derecha.split('+');
              let c = partes.find(p => !p.includes('x'));
              let a = c ? -parseFloat(c) : 0;
              puntos.push({ x: a, y: 0, label: `(${a},0)` });
            } else if (derecha.includes('-')) {
              let partes = derecha.split('-');
              if (partes[0].includes('x')) {
                let c = parseFloat(partes[1]);
                puntos.push({ x: c, y: 0, label: `(${c},0)` });
              } else {
                let c = parseFloat(partes[0]);
                puntos.push({ x: c, y: 0, label: `(${c},0)` });
              }
            } else {
              puntos.push({ x: 0, y: 0, label: "(0,0)" });
            }
          } else {
            let c = parseFloat(derecha);
            if (c > 0) {
              puntos.push({ x: 0, y: Math.sqrt(c), label: `(0,${Math.sqrt(c).toFixed(2)})` });
              puntos.push({ x: 0, y: -Math.sqrt(c), label: `(0,${-Math.sqrt(c).toFixed(2)})` });
            }
          }
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
    if (ex.tipo === 'sqrt_frac') {
      let x0 = ex.a;
      puntos.push({ x: x0, y: null, label: `Asíntota x = ${x0}` });
      let argY = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (argY > 0) {
        let y = ex.num / Math.sqrt(argY) + (ex.desplazamientoV || 0);
        puntos.push({ x: 0, y: y, label: `(0,${y.toFixed(2)})` });
      }
      let x1 = ex.reflexion ? ex.a - 1 : ex.a + 1;
      if ((ex.reflexion && x1 < ex.a) || (!ex.reflexion && x1 > ex.a)) {
        let y1 = ex.num / Math.sqrt(1) + (ex.desplazamientoV || 0);
        puntos.push({ x: x1, y: y1, label: `(${x1.toFixed(2)},${y1.toFixed(2)})` });
      }
      return puntos;
    }
    if (ex.tipo === 'racional') {
      let x0 = ex.a;
      puntos.push({ x: x0, y: null, label: `Asíntota x = ${x0}` });
      let argY = ex.reflexion ? ex.a - 0 : 0 - ex.a;
      if (argY !== 0) {
        let y = ex.num / argY + (ex.desplazamientoV || 0);
        puntos.push({ x: 0, y: y, label: `(0,${y.toFixed(2)})` });
      }
      let x1 = ex.reflexion ? ex.a - 1 : ex.a + 1;
      if ((ex.reflexion && x1 < ex.a) || (!ex.reflexion && x1 > ex.a)) {
        let y1 = ex.num / 1 + (ex.desplazamientoV || 0);
        puntos.push({ x: x1, y: y1, label: `(${x1.toFixed(2)},${y1.toFixed(2)})` });
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
    if (ex.tipo === 'circunferencia') {
      let [h, k] = ex.centro;
      let r = ex.radio;
      puntos.push({ x: h, y: k, label: `Centro (${h},${k})` });
      puntos.push({ x: h + r, y: k, label: `(${h + r},${k})` });
      puntos.push({ x: h - r, y: k, label: `(${h - r},${k})` });
      puntos.push({ x: h, y: k + r, label: `(${h},${k + r})` });
      puntos.push({ x: h, y: k - r, label: `(${h},${k - r})` });
      return puntos;
    }
    if (ex.tipo === 'elipse') {
      let [h, k] = ex.centro;
      let a = ex.a, b = ex.b;
      puntos.push({ x: h, y: k, label: `Centro (${h},${k})` });
      puntos.push({ x: h + a, y: k, label: `(${h + a},${k})` });
      puntos.push({ x: h - a, y: k, label: `(${h - a},${k})` });
      puntos.push({ x: h, y: k + b, label: `(${h},${k + b})` });
      puntos.push({ x: h, y: k - b, label: `(${h},${k - b})` });
      return puntos;
    }
    if (ex.tipo === 'exponential') {
      let desp = ex.desplazamientoV || 0;
      puntos.push({ x: 0, y: 1 + desp, label: `(0,${(1+desp).toFixed(2)})` });
      puntos.push({ x: 1, y: ex.base + desp, label: `(1,${(ex.base+desp).toFixed(2)})` });
      let cx = obtenerCorteX(ex);
      if (cx !== "No hay" && cx !== "No aplica") {
        let match = cx.match(/\((-?\d+\.?\d*),0\)/);
        if (match) {
          let x0 = parseFloat(match[1]);
          puntos.push({ x: x0, y: 0, label: `(${x0.toFixed(2)},0)` });
        }
      }
      return puntos;
    }
  } catch (e) {
    console.error("Error calculando puntos notables", e);
  }
  return puntos;
}

function calcularLimitesX(ex, puntosNotables) {
  let xs = [];
  puntosNotables.forEach(p => {
    if (p.x !== null && isFinite(p.x)) xs.push(p.x);
  });
  xs.push(0);
  if (ex.tipo === 'sqrt') xs.push(ex.a);
  if (ex.tipo === 'sqrt_frac') xs.push(ex.a);
  if (ex.tipo === 'racional') xs.push(ex.a);
  if (ex.tipo === 'relacion' && ex.forma.includes('y2')) {
    let latex = ex.latex;
    let match = latex.match(/y\^2\s*=\s*(.+)/);
    if (match) {
      let derecha = match[1].replace(/\s/g, '');
      if (derecha.includes('x')) {
        if (derecha.includes('+')) {
          let partes = derecha.split('+');
          let c = partes.find(p => !p.includes('x'));
          let a = c ? -parseFloat(c) : 0;
          xs.push(a);
        } else if (derecha.includes('-')) {
          let partes = derecha.split('-');
          if (partes[0].includes('x')) {
            let c = parseFloat(partes[1]);
            xs.push(c);
          } else {
            let c = parseFloat(partes[0]);
            xs.push(c);
          }
        } else {
          xs.push(0);
        }
      }
    }
  }
  if (ex.tipo === 'circunferencia' || ex.tipo === 'elipse') {
    let [h, k] = ex.centro;
    let a = ex.tipo === 'circunferencia' ? ex.radio : ex.a;
    xs.push(h - a);
    xs.push(h + a);
  }
  if (ex.tipo === 'exponential') {
    let cx = obtenerCorteX(ex);
    if (cx !== "No hay" && cx !== "No aplica") {
      let match = cx.match(/\((-?\d+\.?\d*),0\)/);
      if (match) {
        xs.push(parseFloat(match[1]));
      }
    }
  }
  xs = xs.filter(x => isFinite(x) && !isNaN(x));
  if (xs.length === 0) return { min: -10, max: 10 };
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let padding = Math.max(2, (maxX - minX) * 0.2);
  minX -= padding;
  maxX += padding;
  if (maxX - minX < 10) {
    let center = (minX + maxX) / 2;
    minX = center - 5;
    maxX = center + 5;
  }
  minX = Math.max(-MAX_ABS, minX);
  maxX = Math.min(MAX_ABS, maxX);
  return { min: redondear(minX), max: redondear(maxX) };
}

function calcularLimitesY(dataPrincipal, dataNegativa) {
  let ys = [];
  dataPrincipal.forEach(p => ys.push(p.y));
  dataNegativa.forEach(p => ys.push(p.y));
  if (ys.length === 0) return { min: -10, max: 10 };
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  let padding = Math.max(2, (maxY - minY) * 0.2);
  minY -= padding;
  maxY += padding;
  if (maxY - minY < 10) {
    let center = (minY + maxY) / 2;
    minY = center - 5;
    maxY = center + 5;
  }
  minY = Math.max(-MAX_ABS, minY);
  maxY = Math.min(MAX_ABS, maxY);
  return { min: redondear(minY), max: redondear(maxY) };
}

function generarGrafica() {
  let idx = parseInt(document.getElementById('exerciseSelect').value) || 0;
  if (ejercicios.length === 0) return;
  let ex = ejercicios[idx];
  if (!ex.graficable) return;

  let canvas = document.getElementById('mainChart');
  if (!canvas) return;
  let ctx = canvas.getContext('2d');

  if (chartInstance) chartInstance.destroy();

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
          y = (ex.h !== undefined) ? ex.a * Math.pow(x - ex.h, 2) + ex.k : ex.a * x * x + ex.b * x + ex.c;
          break;
        case 'sqrt':
          let argumento = ex.reflexion ? ex.a - x : x - ex.a;
          if (argumento >= 0) y = Math.sqrt(argumento) + (ex.desplazamientoV || 0);
          break;
        case 'sqrt_frac':
          let argF = ex.reflexion ? ex.a - x : x - ex.a;
          if (argF > 0) y = ex.num / Math.sqrt(argF) + (ex.desplazamientoV || 0);
          break;
        case 'racional':
          let argR = ex.reflexion ? ex.a - x : x - ex.a;
          if (Math.abs(argR) > 1e-10) {
            y = ex.num / argR + (ex.desplazamientoV || 0);
          }
          break;
        case 'relacion':
          if (ex.forma.includes('y2')) {
            let latex = ex.latex;
            let match = latex.match(/y\^2\s*=\s*(.+)/);
            if (match) {
              let derecha = match[1].replace(/\s/g, '');
              let valor;
              if (derecha.includes('x')) {
                if (derecha.includes('+')) {
                  let partes = derecha.split('+');
                  let c = partes.find(p => !p.includes('x'));
                  valor = x + (c ? parseFloat(c) : 0);
                } else if (derecha.includes('-')) {
                  let partes = derecha.split('-');
                  if (partes[0].includes('x')) {
                    let c = parseFloat(partes[1]);
                    valor = x - c;
                  } else {
                    let c = parseFloat(partes[0]);
                    valor = c - x;
                  }
                } else {
                  valor = x;
                }
              } else {
                valor = parseFloat(derecha);
              }
              if (valor >= 0) {
                y = Math.sqrt(valor);
                yNeg = -Math.sqrt(valor);
              }
            }
          }
          break;
        case 'circunferencia':
          let [h, k] = ex.centro;
          let r = ex.radio;
          let radicando = r * r - (x - h) * (x - h);
          if (radicando >= 0) {
            y = k + Math.sqrt(radicando);
            yNeg = k - Math.sqrt(radicando);
          }
          break;
        case 'elipse':
          let [h2, k2] = ex.centro;
          let a = ex.a, b = ex.b;
          let radicando2 = 1 - ((x - h2) * (x - h2)) / (a * a);
          if (radicando2 >= 0) {
            y = k2 + b * Math.sqrt(radicando2);
            yNeg = k2 - b * Math.sqrt(radicando2);
          }
          break;
        case 'exponential':
          y = Math.pow(ex.base, x) + (ex.desplazamientoV || 0);
          break;
      }
    } catch (e) {
      y = null;
    }

    if (y !== null && isFinite(y)) dataPrincipal.push({ x: redondear(x), y: redondear(y) });
    if (yNeg !== null && isFinite(yNeg)) dataNegativa.push({ x: redondear(x), y: redondear(yNeg) });
  }

  const limitesY = calcularLimitesY(dataPrincipal, dataNegativa);
  dataPrincipal = dataPrincipal.filter(p => p.y >= limitesY.min && p.y <= limitesY.max);
  dataNegativa = dataNegativa.filter(p => p.y >= limitesY.min && p.y <= limitesY.max);

  const datasets = [
    {
      label: 'f(x)',
      data: dataPrincipal,
      borderColor: '#2b6cb0',
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      fill: false,
      tension: 0.1
    }
  ];

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

  if (puntosNotables.length > 0) {
    const puntosVisibles = puntosNotables
      .filter(p => p.y !== null && p.y >= limitesY.min && p.y <= limitesY.max)
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
            color: context => (context.tick.value === 0 ? '#000' : '#e5e5e5'),
            lineWidth: context => (context.tick.value === 0 ? 2 : 1)
          },
          title: { display: true, text: 'Eje X' }
        },
        y: {
          type: 'linear',
          min: limitesY.min,
          max: limitesY.max,
          grid: {
            color: context => (context.tick.value === 0 ? '#000' : '#e5e5e5'),
            lineWidth: context => (context.tick.value === 0 ? 2 : 1)
          },
          title: { display: true, text: 'Eje Y' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => `(${item.parsed.x.toFixed(1)}, ${item.parsed.y.toFixed(1)})`
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
window.onload = function () {
  initDarkMode();
  cargarEjercicios();
  document.getElementById('exerciseSelect').addEventListener('change', cargarEjercicio);
};