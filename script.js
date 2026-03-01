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
// FUNCIONES DE CÁLCULO (MEJORADAS PARA RELACIONES)
// ------------------------------------------------------------
function obtenerCorteX(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma === 'circulo') {
        let r = Math.sqrt(ex.r2);
        return `(${r.toFixed(1)},0) y (${-r.toFixed(1)},0)`;
      }
      if (ex.forma.includes('y2')) {
        // Analizar la expresión LaTeX para encontrar el corte con X (y=0)
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          // Buscar un número que podría estar sumando o restando x
          if (derecha.includes('x')) {
            // Forma: x + c  o  c - x
            if (derecha.includes('+')) {
              let partes = derecha.split('+');
              let c = partes.find(p => !p.includes('x'));
              if (c) return `(${parseFloat(c)},0)`;
            } else if (derecha.includes('-')) {
              let partes = derecha.split('-');
              // Puede ser "c - x" o "x - c"
              if (partes[0].includes('x')) {
                // x - c  => corte en x = c
                let c = partes[1];
                return `(${parseFloat(c)},0)`;
              } else {
                // c - x  => corte en x = c
                let c = partes[0];
                return `(${parseFloat(c)},0)`;
              }
            } else {
              // Solo "x" (sin constante) o "x + constante" sin signo explícito
              if (derecha === 'x') return "(0,0)";
              // Si es algo como "x+1" ya se capturó en el caso '+'
            }
          } else {
            // No hay x, entonces es y^2 = constante (como y^2=4) -> no corte con X (solo si constante=0)
            if (parseFloat(derecha) === 0) return "(0,0)";
            return "No hay";
          }
        }
        return "No hay";
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
    return "No disponible";
  } catch { return "Error"; }
}

function obtenerCorteY(ex) {
  try {
    if (ex.tipo === 'producto') return "No aplica";
    if (ex.tipo === 'relacion') {
      if (ex.forma === 'circulo') {
        let r = Math.sqrt(ex.r2);
        return `(0, ${r.toFixed(1)}) y (0, -${r.toFixed(1)})`;
      }
      if (ex.forma.includes('y2')) {
        // Analizar la expresión para x=0
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          // Evaluar en x=0
          let valor;
          if (derecha.includes('x')) {
            if (derecha.includes('+')) {
              let partes = derecha.split('+');
              let c = partes.find(p => !p.includes('x'));
              valor = c ? parseFloat(c) : 0;
            } else if (derecha.includes('-')) {
              let partes = derecha.split('-');
              if (partes[0].includes('x')) {
                // x - c => 0 - c = -c
                let c = partes[1];
                valor = -parseFloat(c);
              } else {
                // c - x => c - 0 = c
                let c = partes[0];
                valor = parseFloat(c);
              }
            } else {
              // Solo x, entonces valor = 0
              valor = 0;
            }
          } else {
            // Constante pura
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
    return "No disponible";
  } catch { return "Error"; }
}

function obtenerDominio(ex) {
  if (ex.tipo === 'producto') return "Conjunto finito";
  if (ex.tipo === 'sqrt') {
    if (ex.reflexion) return `(-∞, ${ex.a}]`;
    else return `[${ex.a}, ∞)`;
  }
  if (ex.tipo === 'lineal' || ex.tipo === 'quad' || ex.tipo === 'exp') return "ℝ";
  if (ex.tipo === 'relacion') {
    if (ex.forma === 'circulo') {
      let r = Math.sqrt(ex.r2);
      return `[${-r.toFixed(1)}, ${r.toFixed(1)}]`;
    }
    if (ex.forma.includes('y2')) {
      // Analizar expresión para dominio (condición de no negatividad)
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
              // x - c
              let c = partes[1];
              return `[${parseFloat(c).toFixed(1)}, ∞)`;
            } else {
              // c - x
              let c = partes[0];
              return `(-∞, ${parseFloat(c).toFixed(1)}]`;
            }
          } else {
            // Solo x
            return "[0, ∞)";
          }
        } else {
          // Constante pura
          return parseFloat(derecha) >= 0 ? "ℝ" : "∅";
        }
      }
      return "ℝ";
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
  if (ex.tipo === 'relacion') {
    if (ex.forma === 'circulo') {
      let r = Math.sqrt(ex.r2);
      return `[${-r.toFixed(1)}, ${r.toFixed(1)}]`;
    }
    if (ex.forma.includes('y2')) {
      return "[0, ∞)";
    }
  }
  return "ℝ";
}

function esFuncion(ex) {
  if (ex.tipo === 'relacion' && (ex.forma === 'circulo' || ex.forma.includes('y2'))) return 1; // No es función
  if (ex.tipo === 'producto') return 1; // No es función (relación)
  return 0; // Es función
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
      case 'exp':
        let base = ex.base === 'e' ? Math.E : ex.base;
        let yCalcExp = Math.pow(base, x - ex.a) + (ex.desplazamientoV || 0);
        return Math.abs(yCalcExp - y) < 0.001;
      case 'relacion':
        if (ex.forma === 'circulo') {
          return Math.abs(x*x + y*y - ex.r2) < 0.001;
        }
        if (ex.forma.includes('y2')) {
          let latex = ex.latex;
          let match = latex.match(/y\^2\s*=\s*(.+)/);
          if (match) {
            let derecha = match[1].replace(/\s/g, '');
            // Evaluar lado derecho en x
            let valor;
            if (derecha.includes('x')) {
              if (derecha.includes('+')) {
                let partes = derecha.split('+');
                let c = partes.find(p => !p.includes('x'));
                valor = x + (c ? parseFloat(c) : 0);
              } else if (derecha.includes('-')) {
                let partes = derecha.split('-');
                if (partes[0].includes('x')) {
                  // x - c
                  let c = partes[1];
                  valor = x - parseFloat(c);
                } else {
                  // c - x
                  let c = partes[0];
                  valor = parseFloat(c) - x;
                }
              } else {
                // Solo x
                valor = x;
              }
            } else {
              valor = parseFloat(derecha);
            }
            return Math.abs(y*y - valor) < 0.001;
          }
        }
        return false;
      default: return false;
    }
  } catch { return false; }
}

function esCreciente(ex) {
  if (ex.tipo === 'lineal') return ex.m > 0;
  if (ex.tipo === 'sqrt') return !ex.reflexion;
  if (ex.tipo === 'exp') {
    let base = ex.base === 'e' ? Math.E : ex.base;
    return base > 1;
  }
  return null;
}

function tieneMaximo(ex) {
  if (ex.tipo === 'quad') return ex.a < 0;
  return false;
}

function tieneMinimo(ex) {
  if (ex.tipo === 'quad') return ex.a > 0;
  if (ex.tipo === 'sqrt') return true;
  return false;
}

// ------------------------------------------------------------
// FUNCIÓN PARA NORMALIZAR OPCIONES
// ------------------------------------------------------------
function normalizarOpcion(opt) {
  if (typeof opt !== 'string') return String(opt);
  // Normalizar puntos como (x,y) → un decimal
  let puntoMatch = opt.match(/^\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?$/);
  if (puntoMatch) {
    let x = parseFloat(puntoMatch[1]).toFixed(1);
    let y = parseFloat(puntoMatch[2]).toFixed(1);
    x = x.endsWith('.0') ? x.slice(0, -2) : x;
    y = y.endsWith('.0') ? y.slice(0, -2) : y;
    return `(${x}, ${y})`;
  }
  // Normalizar intervalos como [a,b] o (a,b)
  let intervaloMatch = opt.match(/^([\[\(])\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*([\]\)])$/);
  if (intervaloMatch) {
    let ini = parseFloat(intervaloMatch[2]).toFixed(1);
    let fin = parseFloat(intervaloMatch[3]).toFixed(1);
    ini = ini.endsWith('.0') ? ini.slice(0, -2) : ini;
    fin = fin.endsWith('.0') ? fin.slice(0, -2) : fin;
    return `${intervaloMatch[1]}${ini}, ${fin}${intervaloMatch[4]}`;
  }
  // Normalizar números sueltos
  if (!isNaN(parseFloat(opt)) && isFinite(opt)) {
    let num = parseFloat(opt).toFixed(1);
    return num.endsWith('.0') ? num.slice(0, -2) : num;
  }
  return opt;
}

// ------------------------------------------------------------
// GENERAR PREGUNTAS (con opciones únicas)
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
    let A = ex.A, B = ex.B;
    let producto = [];
    A.forEach(a => B.forEach(b => producto.push(`(${a},${b})`)));
    preguntas.push({
      texto: "Cardinalidad de A × B",
      opciones: [String(A.length * B.length), "|A|+|B|", "|A|", "|B|"],
      correcta: 0,
      explicacion: `A tiene ${A.length} elementos, B tiene ${B.length}. |A×B| = ${A.length} × ${B.length} = ${A.length * B.length}.`
    });
    let parSi = producto[0];
    preguntas.push({
      texto: `¿El par ${parSi} pertenece a A × B?`,
      opciones: ["Sí", "No"],
      correcta: 0,
      explicacion: `Sí, porque se forma con un elemento de A y otro de B.`
    });
    let parNo = `(${A[0]},${Math.max(...B)+1})`;
    preguntas.push({
      texto: `¿El par ${parNo} pertenece a A × B?`,
      opciones: ["Sí", "No"],
      correcta: 1,
      explicacion: `No, porque el segundo elemento no está en B.`
    });
    preguntas.push({
      texto: "A ⊆ B",
      opciones: ["V", "F"],
      correcta: A.every(v => B.includes(v)) ? 0 : 1,
      explicacion: A.every(v => B.includes(v)) ? "Todos los elementos de A están en B." : "Hay elementos de A que no están en B."
    });
    let igual = (A.length === B.length) && A.every(v => B.includes(v)) && B.every(v => A.includes(v));
    preguntas.push({
      texto: "A × B es igual a B × A",
      opciones: ["V", "F"],
      correcta: igual ? 0 : 1,
      explicacion: igual ? "Los conjuntos son iguales porque A = B." : "El producto cartesiano no es conmutativo, salvo que A = B."
    });
    let esFunc = (B.length === 1);
    preguntas.push({
      texto: "A × B representa una función de A en B",
      opciones: ["V", "F"],
      correcta: esFunc ? 0 : 1,
      explicacion: esFunc ? "Cada elemento de A se relaciona con un único elemento de B." : "Cada elemento de A se relaciona con varios elementos de B, por lo que no es función."
    });
  } else {
    let cx = obtenerCorteX(ex);
    let cy = obtenerCorteY(ex);
    let dom = obtenerDominio(ex);
    let ran = obtenerRango(ex);
    let func = esFuncion(ex);
    let vertice = obtenerVertice(ex);

    // Pregunta 1: Corte con X
    let opcionesX = [cx, "(0,0)", "No hay", "(1,0)"];
    let { opciones: opX, correcta: corrX } = crearOpciones(opcionesX, cx);
    preguntas.push({
      texto: "Punto de corte con eje X",
      opciones: opX,
      correcta: corrX,
      explicacion: `Para hallar corte con X, hacemos y=0. Resolviendo se obtiene: ${cx}.`
    });

    // Pregunta 2: Corte con Y
    let opcionesY = [cy, "(0,0)", "No hay", "(0,1)"];
    let { opciones: opY, correcta: corrY } = crearOpciones(opcionesY, cy);
    preguntas.push({
      texto: "Punto de corte con eje Y",
      opciones: opY,
      correcta: corrY,
      explicacion: `Para hallar corte con Y, hacemos x=0. Se obtiene: ${cy}.`
    });

    // Pregunta 3: Dominio
    let opcionesDom = [dom, "ℝ", "[0,∞)", "(-∞,0]"];
    let { opciones: opDom, correcta: corrDom } = crearOpciones(opcionesDom, dom);
    preguntas.push({
      texto: "Dominio (intervalo)",
      opciones: opDom,
      correcta: corrDom,
      explicacion: `El dominio es ${dom}.`
    });

    // Pregunta 4: Rango
    let opcionesRan = [ran, "ℝ", "[0,∞)", "(-∞,0]"];
    let { opciones: opRan, correcta: corrRan } = crearOpciones(opcionesRan, ran);
    preguntas.push({
      texto: "Rango (intervalo)",
      opciones: opRan,
      correcta: corrRan,
      explicacion: `El rango es ${ran}.`
    });

    // Pregunta 5: ¿Es función?
    preguntas.push({
      texto: "¿Representa una función?",
      opciones: ["Sí", "No"],
      correcta: func,
      explicacion: func === 0 ? "Cada x tiene una única imagen." : "Hay valores de x con dos imágenes posibles."
    });

    // Pregunta 6: Vértice
    if (vertice) {
      let opcionesVert = [vertice, "(0,0)", "No tiene vértice", "(1,1)"];
      let { opciones: opVert, correcta: corrVert } = crearOpciones(opcionesVert, vertice);
      preguntas.push({
        texto: "Coordenadas del vértice",
        opciones: opVert,
        correcta: corrVert,
        explicacion: `El vértice es ${vertice}.`
      });
    }

    // Pregunta 7: Representación por comprensión
    let repr = obtenerRepresentacionComprension(ex);
    if (repr) {
      let domErr = dom === "ℝ" ? "[0,∞)" : "ℝ";
      let ranErr = ran === "ℝ" ? "[0,∞)" : "ℝ";
      let expr = obtenerExpresionDerecha(ex);
      let opcionesRepr = [
        repr,
        `\\(F = \\{(x, y) : y = ${expr}, x \\in ${domErr}, y \\in ${ran}\\}\\)`,
        `\\(F = \\{(x, y) : y = ${expr}, x \\in ${dom}, y \\in ${ranErr}\\}\\)`,
        `\\(F = \\{(x, y) : x = ${expr}, y \\in ${dom}, x \\in ${ran}\\}\\)`
      ];
      let unicas = [...new Set(opcionesRepr)];
      let correctIndex = unicas.indexOf(repr);
      preguntas.push({
        texto: "Selecciona la representación por comprensión correcta de la función:",
        opciones: unicas,
        correcta: correctIndex,
        explicacion: "La notación correcta debe incluir la ecuación y el dominio y rango adecuados."
      });
    }

    // Pregunta 8: Punto notable
    let puntoNotable = null;
    if (ex.tipo === 'lineal') puntoNotable = { x: 0, y: ex.b };
    else if (ex.tipo === 'quad' && vertice) {
      let coords = vertice.replace(/[()]/g,'').split(',').map(Number);
      puntoNotable = { x: coords[0], y: coords[1] };
    } else if (ex.tipo === 'sqrt') puntoNotable = { x: ex.a, y: ex.desplazamientoV || 0 };
    else if (ex.tipo === 'exp') {
      let base = ex.base === 'e' ? Math.E : ex.base;
      puntoNotable = { x: 0, y: Math.pow(base, -ex.a) + (ex.desplazamientoV || 0) };
    }
    if (puntoNotable) {
      preguntas.push({
        texto: `¿El punto \\((${puntoNotable.x.toFixed(1)}, ${puntoNotable.y.toFixed(1)})\\) pertenece a la función?`,
        opciones: ["Sí", "No"],
        correcta: 0,
        explicacion: "Sí, porque satisface la ecuación."
      });
    }

    // Pregunta 9: Punto falso
    let xFalso = 5, yFalso = 5;
    preguntas.push({
      texto: `¿El punto \\((${xFalso}, ${yFalso})\\) pertenece a la función?`,
      opciones: ["Sí", "No"],
      correcta: 1,
      explicacion: "No, porque no satisface la ecuación."
    });

    // Pregunta 10: Máximo/mínimo
    if (tieneMaximo(ex)) {
      preguntas.push({
        texto: "La función tiene un máximo",
        opciones: ["V", "F"],
        correcta: 0,
        explicacion: "El coeficiente principal es negativo, por lo que la parábola abre hacia abajo y tiene un máximo en el vértice."
      });
    } else if (tieneMinimo(ex)) {
      preguntas.push({
        texto: "La función tiene un mínimo",
        opciones: ["V", "F"],
        correcta: 0,
        explicacion: "El coeficiente principal es positivo (o es una raíz), por lo que tiene un mínimo."
      });
    }

    // Pregunta 11: Monotonía
    let crec = esCreciente(ex);
    if (crec !== null) {
      preguntas.push({
        texto: "La función es creciente en todo su dominio",
        opciones: ["V", "F"],
        correcta: crec ? 0 : 1,
        explicacion: crec ? "La pendiente es positiva (o base>1, o raíz sin reflexión)." : "La pendiente es negativa o la función decrece."
      });
    }

    // Pregunta 12: Comparación con relación (solo para sqrt)
    if (ex.tipo === 'sqrt') {
      let expr = obtenerExpresionDerecha(ex).replace(/\\sqrt/g, '');
      preguntas.push({
        texto: `¿La ecuación \\(y^2 = ${expr}\\) es equivalente a la función?`,
        opciones: ["Sí", "No"],
        correcta: 1,
        explicacion: "No, porque $y^2 = ...$ representa dos ramas, mientras que la función raíz cuadrada da solo la rama positiva."
      });
    }

    // Pregunta 13: Pertenencia al dominio
    let xTest = -2;
    let perteneceDom = dom.includes('ℝ') || (dom.includes('[') && xTest >= parseFloat(dom.split(',')[0].replace('[',''))) || (dom.includes(']') && xTest <= parseFloat(dom.split(',')[1].replace(']','')));
    preguntas.push({
      texto: `¿El valor \\(x = ${xTest}\\) pertenece al dominio?`,
      opciones: ["Sí", "No"],
      correcta: perteneceDom ? 0 : 1,
      explicacion: `El dominio es ${dom}, por lo tanto ${perteneceDom ? 'sí' : 'no'} pertenece.`
    });

    // Pregunta 14: Pertenencia al rango
    let yTest = 0;
    let perteneceRan = ran.includes('ℝ') || (ran.includes('[') && yTest >= parseFloat(ran.split(',')[0].replace('[',''))) || (ran.includes(']') && yTest <= parseFloat(ran.split(',')[1].replace(']','')));
    preguntas.push({
      texto: `¿El valor \\(y = ${yTest}\\) pertenece al rango?`,
      opciones: ["Sí", "No"],
      correcta: perteneceRan ? 0 : 1,
      explicacion: `El rango es ${ran}, por lo tanto ${perteneceRan ? 'sí' : 'no'} pertenece.`
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

  // Ocultar/mostrar contenedor de gráfica según graficable
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
  if (window.MathJax) MathJax.typesetPromise(); // Forzar renderizado de las nuevas preguntas
  respuestasUsuario = new Array(preguntasActuales.length).fill(null);
  document.getElementById('globalResult')?.classList.add('d-none');
  actualizarProgreso(0);
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

  if (window.MathJax) {
    MathJax.typesetPromise(); // Renderizar LaTeX en feedbacks
  }

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
// FUNCIONES AUXILIARES PARA GRÁFICAS
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
        // Calcular puntos notables analizando la ecuación
        let latex = ex.latex;
        let match = latex.match(/y\^2\s*=\s*(.+)/);
        if (match) {
          let derecha = match[1].replace(/\s/g, '');
          // Vértice (inicio) de la parábola
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
              // Solo x
              puntos.push({ x: 0, y: 0, label: "(0,0)" });
            }
          } else {
            // Constante
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
  } catch (e) {
    console.error("Error calculando puntos notables", e);
  }
  return puntos;
}

function calcularLimitesX(ex, puntosNotables) {
  let xs = [];
  puntosNotables.forEach(p => xs.push(p.x));
  xs.push(0);
  if (ex.tipo === 'sqrt') xs.push(ex.a);
  if (ex.tipo === 'relacion' && ex.forma === 'circulo') {
    let r = Math.sqrt(ex.r2);
    xs.push(-r, r);
  }
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
  if (!ex.graficable) return; // No hacer nada si no es graficable

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
          y = (ex.h !== undefined)
            ? ex.a * Math.pow(x - ex.h, 2) + ex.k
            : ex.a * x * x + ex.b * x + ex.c;
          break;
        case 'sqrt':
          let argumento = ex.reflexion ? ex.a - x : x - ex.a;
          if (argumento >= 0) y = Math.sqrt(argumento) + (ex.desplazamientoV || 0);
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
      }
    } catch (e) { y = null; }

    if (y !== null && isFinite(y)) dataPrincipal.push({ x: redondear(x), y: redondear(y) });
    if (yNeg !== null && isFinite(yNeg)) dataNegativa.push({ x: redondear(x), y: redondear(yNeg) });
  }

  const limitesY = calcularLimitesY(dataPrincipal, dataNegativa);
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