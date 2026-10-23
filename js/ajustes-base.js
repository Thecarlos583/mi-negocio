// Valores de partida. Lo que venga en un respaldo los pisa; lo que falte se completa con esto.
export const ETAPAS = ['Por contactar', 'Contactado', 'Respondió', 'Interesado', 'Llamada agendada', 'Por pagar', 'Cliente', 'Se enfrió', 'No por ahora', 'Perdido'];
export const LINEAS = ['Páginas', 'Sistemas', 'Afuera', 'Asistentes'];
export const ETAPAS_ACTIVAS = ['Respondió', 'Interesado', 'Llamada agendada', 'Por pagar'];

export const PLANTILLAS_BASE = {
  'Sistemas': {
    primer: 'Hola, me llamo Carlos, soy de Mérida. ¿Usted sabe ahorita mismo cuánto le deben sus clientes y quién ya se pasó de la fecha? Hice un sistema que se lo dice en un segundo desde el teléfono, con los bolívares a la tasa del día y sin cuadernos. ¿Le muestro la demo? Son 2 minutos.',
    seg2: 'Hola, soy Carlos otra vez. Le cuento cómo se ve en la práctica: cada cliente tiene su deuda y su fecha, y el sistema le marca en rojo a quien ya se pasó. Si me manda 3 de sus clientes, se lo armo con datos suyos para que lo vea de verdad. ¿Le parece?',
    seg3: 'Hola, última vez que le escribo para no molestar. Los negocios que llevan las cuentas en cuaderno suelen perder de vista una parte de lo que les deben. Si quiere revisar cuánto es en su caso, le dejo la demo disponible cuando guste.',
  },
  'Páginas': {
    primer: 'Hola, me llamo Carlos, soy de Mérida. Hago páginas para negocios donde el cliente ve lo que ofrecen y escribe por WhatsApp con un solo toque. ¿Le preparo una demo con la información de {negocio}, sin compromiso?',
    seg2: 'Hola, soy Carlos otra vez. Para que se haga una idea, así quedaría la página de un negocio como {negocio}: se ve bien en el celular y el cliente reserva o pregunta directo por WhatsApp. ¿Le armo la suya para que la vea?',
    seg3: 'Hola, última vez que le escribo para no molestar. Cuando una persona busca {negocio} en Google y encuentra una página clara, escribe con más confianza. Si quiere ver cómo quedaría la suya, me avisa y se la preparo sin costo.',
  },
  'Páginas|Fisioterapia': {
    primer: 'Hola, me llamo Carlos, soy de Mérida. Hago páginas para fisioterapeutas donde el paciente ve sus tratamientos y agenda su cita por WhatsApp con un solo toque. Mire la demo: https://thecarlos583.github.io/Paginas_webs/vista-previa/fisio-fercho-wvfu/ ¿Le preparo una igual con su información, sin compromiso?',
    seg2: 'Hola, soy Carlos otra vez. En la demo el paciente ve los tratamientos, los horarios y escribe directo para pedir su cita. Si me manda su nombre, su zona y 3 tratamientos, le armo la suya para que la vea con su información. ¿Le parece?',
    seg3: 'Hola, última vez que le escribo para no molestar. Muchos pacientes buscan en Google antes de escribir; tener una página propia hace que lo encuentren y lo contacten con más confianza. Cuando quiera ver cómo quedaría la suya, me avisa.',
  },
  'Afuera': {
    primer: 'Hola, me llamo Carlos. Vi la página de {negocio} y tiene buena base. Le preparo gratis una versión renovada para que la compare con la que tiene, sin compromiso. ¿Se la mando?',
    seg2: 'Hola, soy Carlos otra vez. Revisé {negocio} con calma y veo dos mejoras rápidas: que cargue más rápido en el celular y que el botón de contacto se vea desde el primer vistazo. Con gusto le muestro cómo quedaría. ¿Se la mando?',
    seg3: 'Hola, última vez que le escribo para no molestar. La mayoría de las visitas llegan desde el celular, y ahí una página lenta pierde clientes. Si quiere ver la versión renovada de {negocio}, me avisa y se la preparo.',
  },
  'Asistentes': {
    primer: 'Hola, me llamo Carlos. Armo asistentes que responden precios y horarios por WhatsApp las 24 horas, con la información real de su negocio. ¿Le muestro un ejemplo en menos de un minuto?',
    seg2: 'Hola, soy Carlos otra vez. Un asistente responde lo que más le preguntan (precios, horarios, ubicación) y le pasa a usted solo a quien está listo para comprar. ¿Le muestro cómo se ve?',
    seg3: 'Hola, última vez que le escribo para no molestar. Si algún día quiere ahorrar tiempo contestando lo mismo todo el día, aquí estoy para mostrarle el ejemplo.',
  },
};

export const AJUSTES_BASE = {
  metaMensualUSD: 300,
  limiteFrioDiario: 15,
  cupoDiario: { Afuera: 5, Sistemas: 5, Páginas: 5 },
  diasSeguimiento: [3, 7],
  diasReactivar: 90,
  tasaBCV: null,
  tasasHistorial: [],
  precios: {},
  plantillas: PLANTILLAS_BASE,
};

export function completarAjustes(a = {}) {
  const base = structuredClone(AJUSTES_BASE);
  const r = { ...base, ...a };
  r.cupoDiario = { ...base.cupoDiario, ...(a.cupoDiario || {}) };
  r.plantillas = { ...base.plantillas, ...(a.plantillas || {}) };
  r.tasasHistorial = a.tasasHistorial || (a.tasaBCV ? [a.tasaBCV] : []);
  return r;
}
