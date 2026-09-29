/* Español. Sigue el glosario de la app: solicitud, cabecera, entorno, espacio de trabajo. */
export default {
  locale: 'es',
  htmlLang: 'es',

  meta: {
    home: {
      title: 'Carom — un cliente HTTP rápido y pensado para el teclado, en el escritorio',
      description:
        'Compón, organiza y envía solicitudes HTTP. Variables por carpeta y entorno, datos de prueba generados, scripts y solicitudes que salen directo de tu equipo — sin CORS, sin cuenta en la nube.',
    },
    guide: {
      title: 'Guía — cómo usar Carom, atajos y variables',
      description:
        'Cómo usar Carom: solicitudes, variables y entornos, datos generados, scripts, importar desde Postman, compartir un espacio de trabajo en una carpeta y todos los atajos de teclado.',
    },
  },

  ui: {
    nav: {
      label: 'Principal',
      skip: 'Saltar al contenido',
      features: 'Funciones',
      tour: 'Recorrido',
      download: 'Descargar',
      guide: 'Guía',
      home: 'Resumen',
      language: 'Idioma',
      theme: 'Cambiar entre oscuro y claro',
    },
    footer: {
      tagline: 'Un cliente HTTP para el escritorio.',
      label: 'Pie de página',
      releases: 'Versiones',
      issues: 'Informar de un problema',
      license: 'Licencia',
    },
  },

  home: {
    hero: {
      eyebrow: 'Cliente HTTP de escritorio',
      title: 'Envía solicitudes.',
      accent: 'Sin perder el ritmo.',
      lead: 'Carom es un cliente de escritorio para componer, organizar y enviar solicitudes HTTP. **Pensado para el teclado**, con variables con alcance por carpeta y entorno, y respuestas fáciles de leer.',
      download: 'Descargar Carom',
      guide: 'Leer la guía',
      note: 'macOS, Windows y Linux · se actualiza solo donde el sistema lo permite',
      shotAlt:
        'La ventana de Carom: el árbol del espacio de trabajo a la izquierda, una solicitud GET con sus cabeceras en el centro y la respuesta JSON formateada a la derecha.',
    },

    pillars: {
      title: 'Todo lo que una solicitud necesita, y nada más',
      lead: 'Las piezas que usas todo el día, a mano y coherentes entre sí.',
      items: [
        {
          icon: 'keyboard',
          title: 'Pensado para el teclado',
          text: 'Busca todo con [[Mod+K]], ve a una solicitud con [[Mod+P]], envía con [[Mod+Enter]]. Cada atajo se puede reasignar.',
        },
        {
          icon: 'layers',
          title: 'Variables con alcance',
          text: 'Escribe `{{baseUrl}}` una vez. Una carpeta puede sobrescribir el entorno activo, que puede sobrescribir el base — y al pasar el ratón ves cuál ganó.',
        },
        {
          icon: 'sparkles',
          title: 'Datos de prueba generados',
          text: '67 generadores como `{{$randomFullName}}` y `{{$randomEmail}}`, con los nombres de Postman. Cada aparición recibe su propio valor, en el idioma que elijas.',
        },
        {
          icon: 'code',
          title: 'Scripts',
          text: 'Scripts previos a la solicitud y posteriores a la respuesta, en una solicitud o en una carpeta entera. Guarda un token de una respuesta y úsalo en la siguiente solicitud.',
        },
        {
          icon: 'swap',
          title: 'Trae lo que ya tienes',
          text: 'Importa desde Postman, Insomnia, OpenAPI, HAR o un comando curl. Exporta a Carom u OpenAPI 3.1, o copia cualquier solicitud como curl.',
        },
        {
          icon: 'palette',
          title: 'A tu gusto',
          text: 'Cinco paletas incluidas y tus propios colores, oscuro o claro, en English, Português o Español.',
        },
      ],
    },

    tour: {
      title: 'Una mirada de cerca',
      lead: 'Capturas reales de la app, enviando solicitudes a una API inventada.',
      caption: 'Las capturas muestran un espacio de trabajo preparado para la demostración. La interfaz es la real; la API y sus datos son inventados.',
      items: [
        {
          shot: 'environments',
          icon: 'layers',
          kicker: 'Entornos',
          title: 'Cambia de contexto sin salir de la solicitud',
          text: 'Pulsa [[Mod+E]] y un panel se desliza junto a tu trabajo. Staging, producción, tu equipo — cada uno con su color, para saber siempre adónde va la solicitud.',
          bullets: [
            'Edita los valores ahí mismo y ve el efecto al instante',
            'Variables de la carpeta y del entorno activo, lado a lado',
            'Selecciona texto en cualquier campo, haz clic derecho y conviértelo en variable',
          ],
          alt: 'El panel de entornos abierto junto a la solicitud, con Base, Staging y Producción y sus variables.',
        },
        {
          shot: 'palette',
          icon: 'keyboard',
          kicker: 'Paleta de comandos',
          title: 'Encuentra cualquier cosa, ejecuta cualquier cosa',
          text: 'Una paleta para solicitudes, espacios de trabajo y comandos. Escribe unas letras del nombre, o ve directo a una lista: [[Mod+P]] para solicitudes, [[Mod+R]] para espacios de trabajo, [[Mod+Shift+P]] para comandos.',
          bullets: [
            'Cada resultado muestra el atajo que también tiene',
            'Las pestañas abiertas también se buscan, con [[Mod+Shift+E]]',
            'Cambia de espacio de trabajo sin tocar el ratón',
          ],
          alt: 'La paleta de comandos abierta sobre el área de trabajo, filtrando solicitudes mientras escribes.',
        },
        {
          shot: 'generated',
          icon: 'sparkles',
          kicker: 'Datos generados',
          title: 'Datos falsos que parecen usuarios de verdad',
          text: 'Pon `{{$randomFullName}}` en un cuerpo y se inventa una persona nueva en cada envío. Pasa el ratón por una variable para ver qué es, pedir otro ejemplo o definirla.',
          bullets: [
            'Nombres, ciudades, calles y teléfonos siguen el idioma de la interfaz',
            'Fija el idioma de los datos generados por separado en los Ajustes',
            'Una errata sigue en rojo, y lo notas antes que el servidor',
          ],
          alt: 'Un cuerpo JSON con variables generadas, una ventana emergente que explica una de ellas y la respuesta con los valores que se enviaron.',
        },
        {
          shot: 'light',
          icon: 'palette',
          kicker: 'Temas',
          title: 'Oscuro cuando quieres, claro cuando lo necesitas',
          text: 'Elige una paleta, ajusta los colores, cambia el tamaño del texto. Los colores de la sintaxis JSON también son tuyos.',
          bullets: ['Carom, Midnight, Ember, Forest y Paper', 'Cambia cualquier color y guárdalo como tu propia paleta', 'Fuentes para la interfaz y para el código, con tamaño'],
          alt: 'El mismo espacio de trabajo con el tema claro.',
        },
      ],
    },

    native: {
      title: 'Las solicitudes salen de tu equipo',
      lead: 'La app de escritorio envía las solicitudes de forma nativa, como curl — no a través de un navegador, ni del servidor de nadie.',
      points: [
        { title: 'Sin CORS', text: 'El navegador decide a qué APIs puede llamar una página. Un cliente nativo no tiene esa regla, así que la API que estás construyendo responde como respondería a cualquier cliente.' },
        { title: 'localhost y tu red', text: 'Llega a `localhost`, a direcciones de tu red y a servicios internos directamente — lo que un cliente web nunca ve.' },
        { title: 'Sin cuenta, sin sincronización', text: 'Nada donde iniciar sesión. Tus espacios de trabajo viven en tu equipo, y van a una carpeta que elijas cuando quieras compartirlos.' },
      ],
    },

    formats: {
      title: 'Llega como estás, vete como quieras',
      lead: 'Mudarte a Carom no debería significar empezar de cero, e irte no debería significar reescribirlo todo.',
      importTitle: 'Importar',
      importItems: ['Carom', 'Colecciones y entornos de Postman', 'Insomnia (v4 y v5)', 'OpenAPI / Swagger', 'HAR', 'Comandos curl'],
      exportTitle: 'Exportar',
      exportItems: ['Espacio de trabajo, carpeta o solicitud de Carom', 'OpenAPI 3.1', 'curl (copiar)'],
      note: 'Elige qué traer y adónde va — entornos incluidos. Las variables generadas conservan los nombres de Postman, así que las colecciones que las usaban siguen funcionando.',
    },

    shared: {
      title: 'Comparte un espacio de trabajo con git, sin conflictos',
      text: 'En el escritorio, un espacio de trabajo puede vivir en una carpeta de tu proyecto. La carpeta es el registro: abre el espacio de trabajo y la lee, cambia algo y se escribe de vuelta.',
      points: [
        '**Una solicitud por archivo**: dos personas que añaden solicitudes distintas tocan archivos distintos, y git los une solo.',
        'Los **nombres** de las variables viajan con el proyecto; los **valores** solo donde tú lo indiques, y todo lo que parece una credencial empieza desactivado.',
        'Las respuestas, las ediciones sin guardar y las versiones guardadas se quedan en tu equipo.',
        'Si la carpeta cambia por debajo de la app — un `git pull`, por ejemplo — se detiene y te avisa en vez de sobrescribir.',
      ],
    },

    privacy: {
      title: 'Tuyo, y sigue siéndolo',
      text: 'Carom se ejecuta en tu ordenador. Está hecho para que lo que envías y lo que recibes quede entre tú y la API.',
      points: [
        'Sin cuenta, y sin analíticas ni telemetría en la app.',
        'La única solicitud que Carom hace por su cuenta es consultar GitHub por una versión nueva — y se puede desactivar en los Ajustes.',
        'Los scripts no están en un entorno aislado. Alcanzan lo que alcanza la app, así que trata los scripts de una colección importada como código de quien los escribió.',
      ],
    },

    download: {
      title: 'Descargar Carom',
      lead: 'Elige tu sistema. Los botones llevan a la última versión; si el navegador bloquea el enlace directo, la página de Versiones tiene todos los archivos.',
      note: '¿Buscas otra cosa?',
      releases: 'Todos los instaladores están en la página de Versiones.',
      platforms: {
        mac: { name: 'macOS', detail: 'Apple Silicon (M1 en adelante) o Intel. Arrastra Carom a **Aplicaciones** y mira la nota de primer uso más abajo.' },
        win: { name: 'Windows', detail: 'El instalador `.exe` es el más sencillo. También hay un `.msi` para instalaciones gestionadas.' },
        linux: { name: 'Linux', detail: '`.deb` para Debian y Ubuntu, `.rpm` para Fedora y RHEL, `.AppImage` para el resto.' },
      },
      firstRun: {
        title: 'La primera vez que lo abras',
        lead: 'Carom todavía no está firmado con un certificado de desarrollador de pago, así que macOS y Windows piden una confirmación, una sola vez. Es lo esperado y no indica ningún problema con la descarga.',
        items: [
          {
            id: 'mac',
            title: 'macOS: «Apple no puede verificar que Carom no contiene software malicioso»',
            text: 'Después de arrastrar Carom a **Aplicaciones**, quita el atributo de cuarentena que añadió el navegador — una línea en Terminal:',
            command: 'xattr -cr /Applications/Carom.app',
            after: '¿Prefieres sin Terminal? Haz doble clic en Carom y pulsa **OK**, abre **Ajustes del Sistema → Privacidad y seguridad**, baja hasta el final, elige **Abrir igualmente** y confirma. Solo se hace una vez.',
          },
          {
            id: 'win',
            title: 'Windows: «Windows protegió su PC»',
            text: 'SmartScreen muestra esto con los instaladores sin certificado de firma de código. Elige **Más información → Ejecutar de todas formas**.',
          },
          {
            id: 'linux',
            title: 'Linux: AppImage y dependencias',
            text: 'El `.deb` y el `.rpm` se instalan con el gestor de paquetes. El AppImage hay que marcarlo antes como ejecutable:',
            command: 'chmod +x Carom_*_amd64.AppImage\n./Carom_*_amd64.AppImage',
            after: 'Bibliotecas del sistema necesarias: `libwebkit2gtk-4.1-0` y `libgtk-3-0` (los paquetes las declaran; el AppImage no).',
          },
        ],
      },
      updates: {
        title: 'Actualizaciones',
        text: 'Las versiones para macOS, Windows y AppImage se actualizan solas desde la app. El `.deb` y el `.rpm` pertenecen a tu gestor de paquetes, así que Carom te lleva a la página de la versión.',
      },
    },

    faq: {
      title: 'Preguntas',
      items: [
        { q: '¿Carom es gratis?', a: 'Sí, es gratis de usar, por ahora. El código es público para que cualquiera pueda leerlo y auditarlo, pero Carom no es de código abierto: leerlo no da derecho a copiarlo, modificarlo ni redistribuirlo. Los términos pueden cambiar en versiones futuras; una versión que ya tienes conserva los términos con los que se publicó. Lee la [licencia](https://github.com/lucasdias1707/carom-client-api/blob/main/LICENSE).' },
        { q: '¿Hay versión web?', a: 'Hay una versión para el navegador, pero un navegador no puede hacer lo que un cliente necesita: el CORS limita a qué APIs llama y una página nunca llega a `localhost` ni a tu red. La app de escritorio es la forma recomendada de usar Carom.' },
        { q: '¿Funciona con colecciones de Postman?', a: 'Sí. Importa colecciones y entornos de Postman eligiendo qué traer y adónde. Los scripts escritos con `pm.*` siguen funcionando, y los nombres de las variables generadas son los de Postman.' },
        { q: '¿Se puede exportar a Postman?', a: 'No directamente. Puedes exportar al formato propio de Carom o a OpenAPI 3.1, y copiar cualquier solicitud como curl.' },
        { q: '¿Dónde se guardan mis datos?', a: 'En tu equipo. Un espacio de trabajo también puede guardarse en una carpeta que elijas — dentro de un repositorio git, por ejemplo — para compartirlo con un equipo.' },
        { q: '¿Recopila algo?', a: 'Sin analíticas ni telemetría. Lo único que hace por sí solo es consultar GitHub por una versión nueva, y se puede desactivar en los Ajustes.' },
        { q: '¿En qué idiomas habla?', a: 'English, Português (BR) y Español. La primera vez sigue el idioma del sistema y lo cambias en los Ajustes.' },
        { q: '¿Por qué el sistema me avisa al abrirlo?', a: 'Carom no está firmado con un certificado de desarrollador de pago. El aviso es el sistema diciendo que no puede garantizar quién publica; los pasos de arriba lo resuelven de una vez.' },
      ],
    },

    final: {
      title: '¿Listo para enviar tu primera solicitud?',
      text: 'Descárgalo, y la guía te lleva de un espacio de trabajo vacío a uno compartido.',
    },
  },

  guide: {
    eyebrow: 'Guía',
    title: 'Cómo usar Carom',
    lead: 'De la primera solicitud a las variables, los scripts, compartir y todos los atajos de teclado. Breve, y en el orden en que lo vas a necesitar.',
    tocTitle: 'En esta página',
    osLabel: 'Mostrar teclas para',
    noteLabels: { tip: 'Consejo', warn: 'Cuidado', info: 'Conviene saber' },
    shortcutsHead: ['Acción', 'Atajo'],
    generatorsFilter: 'Filtrar variables generadas',
    generatorsNone: 'Nada coincide con eso.',

    sections: [
      {
        id: 'start',
        title: 'Tu primera solicitud',
        lead: 'Diez segundos entre abrir la app y tener una respuesta.',
        blocks: [
          {
            ol: [
              'Pulsa [[Mod+N]] para una solicitud nueva — o usa el **+** de la barra de pestañas.',
              'Elige el método y escribe la URL. `{{baseUrl}}/pokemon/pikachu` funciona cuando hayas definido `baseUrl` (mira [Variables](#variables)).',
              'Pulsa [[Mod+Enter]] — o **Enter** con el cursor en el campo de la URL — para enviar.',
              'La respuesta aparece a la derecha: estado, tiempo, tamaño y el cuerpo formateado.',
            ],
          },
          { note: 'Las ediciones son un borrador hasta que pulses [[Mod+S]]. La barra de la URL muestra lo que no está guardado y permite descartarlo. Cada guardado también conserva una versión — las últimas 20 — que restauras desde la pestaña Versiones.', kind: 'tip' },
        ],
      },
      {
        id: 'organise',
        title: 'Espacios de trabajo, carpetas y pestañas',
        blocks: [
          { p: 'Un **espacio de trabajo** reúne carpetas, solicitudes y entornos. Cambia entre ellos con [[Mod+R]] o desde el menú de arriba en la barra lateral.' },
          {
            ul: [
              'Las **carpetas** agrupan solicitudes, se pueden anidar y pueden tener sus propias variables, autenticación y scripts, que valen para todo lo que hay dentro.',
              '**Arrastra y suelta** para reordenar o mover una solicitud a una carpeta. Arrastrar se desactiva mientras hay un filtro activo, para que nada acabe en el sitio equivocado.',
              '**Filtra** el árbol con el cuadro de encima, o ve directo a una solicitud con [[Mod+P]].',
              'Haz clic derecho en una **pestaña** para localizarla en el árbol, cerrarla, cerrar las demás o cerrar todas. [[Mod+W]] cierra la pestaña activa; [[Mod+Shift+E]] busca entre las abiertas.',
              '[[Mod+B]] oculta y muestra la barra lateral.',
            ],
          },
        ],
      },
      {
        id: 'request',
        title: 'Construir una solicitud',
        blocks: [
          { p: 'Cada solicitud tiene un conjunto de pestañas bajo la barra de la URL:' },
          {
            table: {
              head: ['Pestaña', 'Para qué sirve'],
              rows: [
                ['Parámetros', 'Parámetros de consulta. Editar una fila reescribe la URL, y editar la URL actualiza las filas.'],
                ['Cuerpo', 'Ninguno, JSON, texto, XML, formulario, multipart o GraphQL. JSON y XML tienen formateador.'],
                ['Cabeceras', 'Se añade automáticamente un `Content-Type` acorde con el tipo de cuerpo, salvo que definas uno.'],
                ['Autenticación', 'Heredar de la carpeta, ninguna, token bearer, basic o una clave de API en una cabecera o en la consulta.'],
                ['Scripts', 'Scripts previos a la solicitud y posteriores a la respuesta — mira [Scripts](#scripts).'],
                ['Documentación', 'Documenta los campos de una solicitud — nombre, ejemplo, descripción, obligatorio. Van a una exportación OpenAPI.'],
                ['Versiones', 'Las últimas 20 versiones guardadas de esta solicitud, cada una restaurable.'],
              ],
            },
          },
          { p: 'Define la autenticación una vez en una **carpeta** y todas las solicitudes de dentro la heredan; una solicitud aún puede elegir la suya.' },
        ],
      },
      {
        id: 'variables',
        title: 'Variables y entornos',
        lead: 'Escribe `{{nombre}}` en cualquier sitio — URL, cabeceras, cuerpo, autenticación — y Carom lo rellena al enviar.',
        blocks: [
          { h3: 'De dónde viene un valor', id: 'variables-scope' },
          {
            ol: [
              'La **carpeta** en la que está la solicitud. Con carpetas anidadas, gana la más interna.',
              'El **entorno activo**, elegido en el selector de arriba a la derecha.',
              'El entorno **base**, compartido por todos los demás.',
            ],
          },
          { p: 'Pasa el ratón por una variable para ver su valor y cuál de los tres la aportó. Una variable que no está definida en ningún sitio se muestra en rojo.' },
          { h3: 'Definirlas y cambiarlas', id: 'variables-edit' },
          {
            ul: [
              '**Pasa el ratón por una variable**, en la URL o dentro de un cuerpo, y edítala ahí mismo — o defínela si aún no existe.',
              '**Selecciona cualquier texto**, haz clic derecho y elige **Definir** una variable existente o **Nueva variable…**. El valor va al entorno seleccionado, y lo que seleccionaste se sustituye por la referencia.',
              '[[Mod+E]] abre el **panel de entornos**, un editor rápido junto a tu solicitud que muestra el entorno activo y las variables de la carpeta. **Gestionar entornos**, en el selector, abre el diálogo completo para añadir, renombrar, colorear, copiar entre ellos y eliminar entornos.',
            ],
          },
          { note: 'Ponles colores distintos a staging y a producción. El selector de entorno los usa, una forma barata de no enviar lo equivocado al sitio equivocado.', kind: 'tip' },
        ],
      },
      {
        id: 'generated',
        title: 'Datos generados',
        lead: 'Variables que se inventan al enviar la solicitud. Útiles para fixtures, formularios y datos con aspecto realista.',
        blocks: [
          { p: 'Escribe una entre llaves — `{{$randomEmail}}` — y se convierte en un valor nuevo en cada envío. **Cada aparición recibe su propio valor**, así que dos `{{$randomFullName}}` en un cuerpo son dos personas distintas. Eso es lo que separa un generador de una variable.' },
          {
            ul: [
              'Los nombres son los de Postman, así que una colección que los usaba sigue funcionando.',
              'Nombres, ciudades, calles y teléfonos siguen el **idioma de la interfaz**. Los identificadores, números y fechas no tienen idioma y nunca cambian.',
              'Para fijar el idioma de forma independiente — una API que valida direcciones en inglés, leída por alguien que trabaja en español — define **Datos generados** en **Ajustes → General**.',
              'Una variable que definas con el mismo nombre gana al generador.',
              'Un generador mal escrito sigue en rojo, que es el caso que conviene notar.',
            ],
          },
          { generators: true },
          { note: 'En la app, esta misma lista se abre desde la paleta de comandos o desde la pantalla de entornos; haz clic en una fila para copiarla lista para pegar.', kind: 'info' },
        ],
      },
      {
        id: 'scripts',
        title: 'Scripts',
        lead: 'JavaScript que se ejecuta antes de enviar una solicitud o después de que llegue su respuesta.',
        blocks: [
          { p: 'Pon un script en una **solicitud** o en una **carpeta**. Los scripts de una carpeta envuelven cada solicitud de dentro: los previos se ejecutan de la carpeta más externa hacia dentro, los posteriores de la más interna hacia fuera.' },
          {
            table: {
              head: ['Llamada', 'Qué hace'],
              rows: [
                ['`carom.get(nombre)`', 'Lee una variable, incluidas las definidas antes en la misma cadena.'],
                ['`carom.set(nombre, valor)`', 'Escribe una variable en el entorno activo cuando termina el script.'],
                ['`carom.header(clave, valor)`', 'Añade una cabecera a la solicitud saliente (solo previo).'],
                ['`carom.json()`', 'El cuerpo de la respuesta leído como JSON, o `null` (posterior).'],
                ['`carom.request` · `carom.response`', 'La solicitud que se envía y la respuesta que volvió.'],
                ['`console.log(…)`', 'Se escribe en la pestaña Consola de la respuesta.'],
              ],
            },
          },
          { code: '// Script posterior a la respuesta: guarda el token para la siguiente solicitud\nconst body = carom.json();\nif (body && body.token) carom.set("token", body.token);' },
          { p: 'El objeto `pm` de Postman también funciona, `pm.test` incluido, así que los scripts de una colección importada se ejecutan sin cambios.' },
          { note: 'Los scripts no están en un entorno aislado. Se ejecutan con todo lo que la app alcanza, la red incluida. Trata un script que llegó en una colección importada como código de quien lo escribió.', kind: 'warn' },
        ],
      },
      {
        id: 'response',
        title: 'Leer una respuesta',
        blocks: [
          {
            ul: [
              '**Formateado** pliega y despliega el JSON; **Crudo** es exactamente lo que volvió; **Vista previa** renderiza HTML.',
              '**Resaltar en el cuerpo** busca un texto y marca todas las coincidencias.',
              '**Cabeceras**, **Cookies** y **Consola** (salida de los scripts y resultados de `pm.test`) tienen pestañas propias.',
              '**Historial** guarda las últimas 15 respuestas de cada solicitud. Haz clic en una para verla de nuevo.',
              'Copia la respuesta, o guárdala en un archivo, con los botones sobre el cuerpo.',
              'Cuando llega una respuesta de una solicitud en otra pestaña, un aviso te lo dice.',
            ],
          },
          { p: 'Para pasarle una solicitud a alguien como comando, usa **Copiar como curl** junto a la barra de la URL. Sale con tus variables ya rellenadas — y con los valores generados, si el cuerpo los tiene. **Copiar URL** da la URL resuelta.' },
        ],
      },
      {
        id: 'import-export',
        title: 'Importar y exportar',
        blocks: [
          { h3: 'Importar', id: 'import' },
          { p: 'Usa **Importar** al final de la barra lateral. Carom lee exportaciones de Carom, colecciones y entornos de **Postman**, **Insomnia** v4 y v5, **OpenAPI / Swagger**, archivos **HAR** y comandos **curl** pegados. En Postman eliges qué traer y adónde va, entornos incluidos. Lo que no llega — por ejemplo, una solicitud gRPC de Insomnia — se lista antes de que confirmes.' },
          { h3: 'Exportar', id: 'export' },
          { p: 'Usa **Exportar** para un espacio de trabajo, una carpeta (con sus subcarpetas y solicitudes) o una sola solicitud, en el formato de Carom o como **OpenAPI 3.1**. Elige el recorte — entornos incluidos — y dónde guardarlo.' },
          { note: 'No hay exportación a Postman. El formato de Carom y OpenAPI 3.1 son las salidas, además de copiar una solicitud como curl.', kind: 'info' },
        ],
      },
      {
        id: 'share',
        title: 'Compartir un espacio de trabajo con un equipo',
        lead: 'Solo en la app de escritorio.',
        blocks: [
          { p: 'En el menú del espacio de trabajo elige **Guardar este espacio de trabajo en una carpeta** y señala una carpeta de tu proyecto. Una carpeta vacía recibe el espacio de trabajo tal como está; una carpeta que ya contiene uno sustituye el espacio de trabajo por lo que hay en ella.' },
          {
            ul: [
              'Una solicitud por archivo: dos personas que añaden solicitudes distintas cambian archivos distintos, y git los une sin preguntar.',
              'Las carpetas, solicitudes y entornos van a la carpeta. Las respuestas, las ediciones sin guardar y las versiones guardadas se quedan en tu equipo.',
              'Los **nombres** de las variables siempre viajan. Los **valores** viajan solo donde tú lo indiques — la pantalla siguiente pregunta, y todo lo que parece una credencial empieza desactivado.',
              'Los cambios se escriben un instante después de que dejas de teclear, y solo en los archivos que cambian.',
              'Si la carpeta cambia por debajo — tras un `git pull` con la app abierta — Carom deja de escribir y te avisa. Recarga desde el disco y sigue.',
            ],
          },
        ],
      },
      {
        id: 'shortcuts',
        title: 'Atajos de teclado',
        lead: 'Los predeterminados. Todos se pueden cambiar en **Ajustes → General → Atajos de teclado**.',
        blocks: [
          { shortcuts: true },
          { h3: 'En los editores de código', id: 'editor-keys' },
          {
            table: {
              head: ['Tecla', 'Qué hace'],
              rows: [
                ['[[Tab]] · [[Shift+Tab]]', 'Aumenta y reduce la sangría en dos espacios.'],
                ['Escribir `{` `[` o `"`', 'Añade el de cierre y deja el cursor en medio. En XML, `<` también cierra.'],
                ['Seleccionar y escribir uno de apertura', 'Envuelve la selección en vez de reemplazarla.'],
                ['Escribir uno de cierre', 'Pasa por encima de uno que ya está.'],
                ['[[Backspace]] entre un par', 'Borra los dos.'],
                ['[[Enter]] en el campo de la URL', 'Envía la solicitud.'],
              ],
            },
          },
        ],
      },
      {
        id: 'customise',
        title: 'Temas, colores e idioma',
        blocks: [
          {
            ul: [
              '**Ajustes → General**: el idioma de la interfaz (English, Português, Español — sigue al sistema hasta que elijas), el idioma de los datos generados, la disposición de los paneles, el tiempo de espera, las redirecciones y **Atajos de teclado**.',
              '**Ajustes → Tema**: oscuro o claro, cinco paletas incluidas (Carom, Midnight, Ember, Forest, Paper) y fuentes con su tamaño. Cambia cualquier color de una paleta incluida y se convierte en una copia tuya; **Sorpréndeme** baraja una nueva.',
              'En el escritorio, **Ajustes → General → Actualizaciones** comprueba si hay una versión nueva y te deja elegir si Carom lo comprueba solo al iniciar.',
            ],
          },
        ],
      },
      {
        id: 'help',
        title: 'Cuando algo no va bien',
        blocks: [
          {
            table: {
              head: ['Síntoma', 'Por qué, y qué hacer'],
              rows: [
                ['macOS dice que no puede verificar Carom', 'Es lo esperado: la app no está firmada con un certificado de pago. Ejecuta `xattr -cr /Applications/Carom.app` una vez, o usa **Abrir igualmente** en Ajustes del Sistema → Privacidad y seguridad.'],
                ['Windows dice que protegió tu PC', 'Es SmartScreen, por el mismo motivo. **Más información → Ejecutar de todas formas**.'],
                ['Una solicitud falla en la versión web pero no en la app', 'El navegador impone el CORS y no llega a `localhost`. La app de escritorio no tiene ninguno de los dos límites.'],
                ['Una variable aparece en rojo', 'No está definida en la carpeta, en el entorno activo ni en el base. Pasa el ratón para definirla, o revisa el selector de entorno.'],
                ['Instalé con `.deb` o `.rpm` y no hay botón de actualizar', 'Esos pertenecen a tu gestor de paquetes. Carom lleva a la página de la versión.'],
                ['La carpeta guardada dice que cambió en el disco', 'Algo — normalmente un `git pull` — la movió. Recarga desde el disco; lo que editaste desde entonces es lo que conviene revisar.'],
              ],
            },
          },
          { p: '¿Encontraste otra cosa? [Abre un issue](https://github.com/lucasdias1707/carom-client-api/issues) contando qué hiciste, qué esperabas y qué pasó.' },
        ],
      },
    ],
  },
};
