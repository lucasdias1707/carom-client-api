/*
  English is the source: the other two are checked against its shape at build
  time, so a section added here and not translated stops the build rather than
  shipping half a page.

  Strings take `code`, **bold**, [links](url) and [[Mod+K]] keycaps.
*/
export default {
  locale: 'en',
  htmlLang: 'en',

  meta: {
    home: {
      title: 'Carom — a fast, keyboard-first HTTP client for the desktop',
      description:
        'Compose, organise and send HTTP requests. Variables scoped by folder and environment, generated test data, scripts, and requests that leave your machine directly — no CORS, no cloud account.',
    },
    guide: {
      title: 'Guide — how to use Carom, shortcuts and variables',
      description:
        'How to use Carom: requests, variables and environments, generated data, scripts, importing from Postman, sharing a workspace in a folder, and every keyboard shortcut.',
    },
  },

  ui: {
    nav: {
      label: 'Main',
      skip: 'Skip to content',
      features: 'Features',
      tour: 'Tour',
      download: 'Download',
      guide: 'Guide',
      home: 'Overview',
      language: 'Language',
      theme: 'Switch between dark and light',
    },
    footer: {
      tagline: 'An HTTP client for the desktop.',
      label: 'Footer',
      releases: 'Releases',
      issues: 'Report a problem',
      license: 'License',
    },
  },

  home: {
    hero: {
      eyebrow: 'Desktop HTTP client',
      title: 'Send requests.',
      accent: 'Keep your flow.',
      lead: 'Carom is a desktop client for composing, organising and sending HTTP requests. **Keyboard-first**, with variables scoped by folder and environment, and responses that are easy to read.',
      download: 'Download Carom',
      guide: 'Read the guide',
      note: 'macOS, Windows and Linux · updates itself where the system allows',
      shotAlt:
        'The Carom window: a workspace tree on the left, a GET request with its headers in the middle, and the formatted JSON response on the right.',
    },

    pillars: {
      title: 'Everything a request needs, nothing it does not',
      lead: 'The pieces you reach for all day, close at hand and consistent with each other.',
      items: [
        {
          icon: 'keyboard',
          title: 'Keyboard-first',
          text: 'Search everything with [[Mod+K]], jump to a request with [[Mod+P]], send with [[Mod+Enter]]. Every shortcut can be remapped.',
        },
        {
          icon: 'layers',
          title: 'Variables with scope',
          text: 'Write `{{baseUrl}}` once. A folder can override the active environment, which can override the base — and hovering shows you which one won.',
        },
        {
          icon: 'sparkles',
          title: 'Generated test data',
          text: '67 generators such as `{{$randomFullName}}` and `{{$randomEmail}}`, named like Postman’s. Every occurrence gets its own value, in the language of your choice.',
        },
        {
          icon: 'code',
          title: 'Scripts',
          text: 'Pre-request and post-response scripts on a request or a whole folder. Save a token from one response and use it in the next request.',
        },
        {
          icon: 'swap',
          title: 'Bring your work along',
          text: 'Import from Postman, Insomnia, OpenAPI, HAR or a curl command. Export to Carom or OpenAPI 3.1, or copy any request as curl.',
        },
        {
          icon: 'palette',
          title: 'Yours to look at',
          text: 'Five built-in palettes plus your own colours, dark or light, in English, Português or Español.',
        },
      ],
    },

    tour: {
      title: 'A closer look',
      lead: 'Real screenshots of the app, sending requests to a made-up API.',
      caption: 'Screenshots show a staged workspace. The interface is the real one; the API and its data are invented.',
      items: [
        {
          shot: 'environments',
          icon: 'layers',
          kicker: 'Environments',
          title: 'Switch context without leaving the request',
          text: 'Press [[Mod+E]] and a drawer slides in beside your work. Staging, production, your machine — each with its own colour so you always know where a request is going.',
          bullets: [
            'Edit values in place and see them reflected immediately',
            'Folder-level variables and the active environment side by side',
            'Select text in any field, right-click and turn it into a variable',
          ],
          alt: 'The environments drawer open beside the request, listing Base, Staging and Production with their variables.',
        },
        {
          shot: 'palette',
          icon: 'keyboard',
          kicker: 'Command palette',
          title: 'Find anything, run anything',
          text: 'One palette for requests, workspaces and commands. Type a few letters of a name, or reach for a specific list: [[Mod+P]] for requests, [[Mod+R]] for workspaces, [[Mod+Shift+P]] for commands.',
          bullets: [
            'Every result shows the shortcut it also has',
            'Open tabs are searchable too, with [[Mod+Shift+E]]',
            'Switch workspaces without touching the mouse',
          ],
          alt: 'The command palette open over the workbench, filtering requests as you type.',
        },
        {
          shot: 'generated',
          icon: 'sparkles',
          kicker: 'Generated data',
          title: 'Fake data that looks like your users',
          text: 'Put `{{$randomFullName}}` in a body and a new person is made up each time you send. Hover a variable to see what it is, get another example, or define it.',
          bullets: [
            'Names, cities, streets and phone numbers follow the interface language',
            'Pin the language of generated data separately in Settings',
            'A typo stays red, so you notice before the server does',
          ],
          alt: 'A JSON body using generated variables, with a popover explaining one of them and the response showing the values that were sent.',
        },
        {
          shot: 'light',
          icon: 'palette',
          kicker: 'Themes',
          title: 'Dark when you want it, light when you need it',
          text: 'Pick a palette, tune the colours, scale the type. The colours of JSON syntax are yours to change too.',
          bullets: ['Carom, Midnight, Ember, Forest and Paper', 'Change any colour and keep it as your own palette', 'Fonts for the interface and for code, with a size'],
          alt: 'The same workspace in the light theme.',
        },
      ],
    },

    native: {
      title: 'Requests leave from your machine',
      lead: 'The desktop app sends requests natively, the way curl does — not through a browser, and not through anyone’s server.',
      points: [
        { title: 'No CORS', text: 'A browser decides which APIs a page may call. A native client does not have that rule, so the API you are building answers however it would to any client.' },
        { title: 'localhost and your network', text: 'Reach `localhost`, addresses on your network and internal services directly — the things a web-based client can never see.' },
        { title: 'No account, no sync', text: 'Nothing to sign in to. Your workspaces live on your machine, and go into a folder of your choosing when you want to share them.' },
      ],
    },

    formats: {
      title: 'Come as you are, leave as you like',
      lead: 'Moving in should not mean starting over, and moving out should not mean a rewrite.',
      importTitle: 'Import',
      importItems: ['Carom', 'Postman collections and environments', 'Insomnia (v4 and v5)', 'OpenAPI / Swagger', 'HAR', 'curl commands'],
      exportTitle: 'Export',
      exportItems: ['Carom workspace, folder or request', 'OpenAPI 3.1', 'curl (copy)'],
      note: 'Choose what to bring in and where it goes — including environments. Generated variables keep the Postman names, so collections that used them keep working.',
    },

    shared: {
      title: 'Share a workspace through git, without the conflicts',
      text: 'On the desktop, a workspace can live in a folder of your project. The folder is the record: open the workspace and it reads it, change something and it is written back.',
      points: [
        '**One request per file**, so two people adding different requests touch different files and git merges them on its own.',
        'Variable **names** travel with the project; **values** only where you say so, and anything that looks like a credential starts switched off.',
        'Responses, unsaved edits and saved versions stay on your machine.',
        'If the folder changes underneath the app — a `git pull`, say — it stops and tells you rather than overwrite it.',
      ],
    },

    privacy: {
      title: 'Yours, and stays that way',
      text: 'Carom is a tool that runs on your computer. It is built so that what you send and what you get back is between you and the API.',
      points: [
        'No account, and no analytics or telemetry in the app.',
        'The only request Carom makes on its own is checking GitHub for a new version — and you can turn that off in Settings.',
        'Scripts are not sandboxed. They can reach what the app can, so treat scripts from an imported collection as code from whoever wrote it.',
      ],
    },

    download: {
      title: 'Download Carom',
      lead: 'Pick your system. The buttons take you to the latest release; if your browser blocks the direct link, the Releases page has every file.',
      note: 'Looking for something else?',
      releases: 'All installers are on the Releases page.',
      platforms: {
        mac: { name: 'macOS', detail: 'Apple Silicon (M1 and later) or Intel. Drag Carom to **Applications**, then see the first-run note below.' },
        win: { name: 'Windows', detail: 'The `.exe` installer is the simplest. An `.msi` is there for managed installs.' },
        linux: { name: 'Linux', detail: '`.deb` for Debian and Ubuntu, `.rpm` for Fedora and RHEL, `.AppImage` for anything else.' },
      },
      firstRun: {
        title: 'The first time you open it',
        lead: 'Carom is not signed with a paid developer certificate yet, so macOS and Windows ask you to confirm once. That is expected and does not mean anything is wrong with the download.',
        items: [
          {
            id: 'mac',
            title: 'macOS: “Apple could not verify Carom is free of malware”',
            text: 'After dragging Carom to **Applications**, remove the quarantine flag your browser added — one line in Terminal:',
            command: 'xattr -cr /Applications/Carom.app',
            after: 'Prefer no Terminal? Double-click Carom and press **OK**, open **System Settings → Privacy & Security**, scroll down, choose **Open Anyway** and confirm. You only do this once.',
          },
          {
            id: 'win',
            title: 'Windows: “Windows protected your PC”',
            text: 'SmartScreen shows this for installers without a code-signing certificate. Choose **More info → Run anyway**.',
          },
          {
            id: 'linux',
            title: 'Linux: AppImage and dependencies',
            text: 'The `.deb` and `.rpm` install through your package manager. The AppImage needs to be made executable first:',
            command: 'chmod +x Carom_*_amd64.AppImage\n./Carom_*_amd64.AppImage',
            after: 'System libraries needed: `libwebkit2gtk-4.1-0` and `libgtk-3-0` (the packages declare them; the AppImage does not).',
          },
        ],
      },
      updates: {
        title: 'Updates',
        text: 'The macOS, Windows and AppImage builds can update themselves from inside the app. The `.deb` and `.rpm` belong to your package manager, so Carom points you to the release page instead.',
      },
    },

    faq: {
      title: 'Questions',
      items: [
        { q: 'Is Carom free?', a: 'Yes, it is free to use for now. The source code is public so anyone can read and audit it, but Carom is not open source: reading it does not give the right to copy, modify or redistribute it. The terms may change for future versions; a version you already have keeps the terms it was released under. Read the [license](https://github.com/lucasdias1707/carom-client-api/blob/main/LICENSE).' },
        { q: 'Is there a web version?', a: 'There is a browser build, but a browser cannot do what a client needs: CORS limits which APIs it can call and a page can never reach `localhost` or your network. The desktop app is the recommended way to use Carom.' },
        { q: 'Does it work with Postman collections?', a: 'Yes. Import collections and environments from Postman, choosing what to bring in and where. Scripts written with `pm.*` keep running, and the generated-variable names match Postman’s.' },
        { q: 'Can I export to Postman?', a: 'Not directly. You can export to Carom’s own format or to OpenAPI 3.1, and copy any request as curl.' },
        { q: 'Where is my data stored?', a: 'On your machine. A workspace can also be kept in a folder you choose — inside a git repository, for instance — to share it with a team.' },
        { q: 'Does it collect anything?', a: 'No analytics or telemetry. The only thing it does by itself is check GitHub for a new release, which you can turn off in Settings.' },
        { q: 'Which languages does it speak?', a: 'English, Português (BR) and Español. It follows your system language the first time and you can change it in Settings.' },
        { q: 'Why does my system warn me when I open it?', a: 'Carom is not signed with a paid developer certificate. The warning is the system saying it cannot vouch for the publisher; the steps above clear it once.' },
      ],
    },

    final: {
      title: 'Ready to send your first request?',
      text: 'Download it, then the guide takes you from an empty workspace to a shared one.',
    },
  },

  guide: {
    eyebrow: 'Guide',
    title: 'How to use Carom',
    lead: 'From your first request to variables, scripts, sharing and every keyboard shortcut. Short, and in the order you will need it.',
    tocTitle: 'On this page',
    osLabel: 'Show keys for',
    noteLabels: { tip: 'Tip', warn: 'Careful', info: 'Good to know' },
    shortcutsHead: ['Action', 'Shortcut'],
    generatorsFilter: 'Filter generated variables',
    generatorsNone: 'Nothing matches that.',

    sections: [
      {
        id: 'start',
        title: 'Your first request',
        lead: 'Ten seconds from launch to a response.',
        blocks: [
          {
            ol: [
              'Press [[Mod+N]] for a new request — or use the **+** in the tab strip.',
              'Choose the method, type the URL. `{{baseUrl}}/pokemon/pikachu` works once you have defined `baseUrl` (see [Variables](#variables)).',
              'Press [[Mod+Enter]] — or **Enter** while you are in the URL field — to send.',
              'The response appears on the right: status, time, size, and the body formatted.',
            ],
          },
          { note: 'Edits stay a draft until you press [[Mod+S]]. The URL bar shows what is unsaved and lets you discard it. Every save also keeps a version — the last 20 — that you can restore from the Versions tab.', kind: 'tip' },
        ],
      },
      {
        id: 'organise',
        title: 'Workspaces, folders and tabs',
        blocks: [
          { p: 'A **workspace** holds folders, requests and environments. Switch between them with [[Mod+R]] or from the menu at the top of the sidebar.' },
          {
            ul: [
              '**Folders** group requests, can be nested, and can carry their own variables, authentication and scripts that apply to everything inside.',
              '**Drag and drop** to reorder or move a request into a folder. Dragging is switched off while a filter is active, so nothing lands in the wrong place.',
              '**Filter** the tree with the box above it, or jump straight to a request with [[Mod+P]].',
              'Right-click a **tab** to locate it in the tree, close it, close the others or close all. [[Mod+W]] closes the active tab; [[Mod+Shift+E]] searches the open ones.',
              '[[Mod+B]] hides and shows the sidebar.',
            ],
          },
        ],
      },
      {
        id: 'request',
        title: 'Building a request',
        blocks: [
          { p: 'Each request has a set of tabs under the URL bar:' },
          {
            table: {
              head: ['Tab', 'What it is for'],
              rows: [
                ['Params', 'Query parameters. Editing a row rewrites the URL, and editing the URL updates the rows.'],
                ['Body', 'None, JSON, text, XML, form, multipart or GraphQL. JSON and XML have a formatter.'],
                ['Headers', 'A `Content-Type` matching the body type is added for you unless you set one.'],
                ['Auth', 'Inherit from the folder, none, bearer token, basic, or an API key in a header or the query.'],
                ['Scripts', 'Pre-request and post-response scripts — see [Scripts](#scripts).'],
                ['Docs', 'Document the fields of a request — name, example, description, required. They go into an OpenAPI export.'],
                ['Versions', 'The last 20 saved versions of this request, each one restorable.'],
              ],
            },
          },
          { p: 'Set authentication once on a **folder** and every request inside inherits it; a request can still choose its own.' },
        ],
      },
      {
        id: 'variables',
        title: 'Variables and environments',
        lead: 'Write `{{name}}` anywhere — URL, headers, body, auth — and Carom fills it in when you send.',
        blocks: [
          { h3: 'Where a value comes from', id: 'variables-scope' },
          {
            ol: [
              'The **folder** the request is in. With nested folders, the innermost one wins.',
              'The **active environment**, chosen in the picker at the top right.',
              'The **base** environment, shared by all the others.',
            ],
          },
          { p: 'Hover a variable to see its value and which of the three supplied it. A variable that is not defined anywhere is shown in red.' },
          { h3: 'Defining and changing them', id: 'variables-edit' },
          {
            ul: [
              '**Hover a variable**, in the URL or inside a body, and edit it right there — or define it if it does not exist yet.',
              '**Select any text**, right-click, and choose **Set** an existing variable or **New variable…**. The value goes into whichever environment is selected, and your selection is replaced with the reference.',
              '[[Mod+E]] opens the **environments drawer**, a quick editor beside your request that shows the active environment and the folder’s variables. **Manage environments**, in the picker, opens the full dialog to add, rename, colour, copy between and delete environments.',
            ],
          },
          { note: 'Give staging and production different colours. The environment picker wears them, which is a cheap way to avoid sending the wrong thing to the wrong place.', kind: 'tip' },
        ],
      },
      {
        id: 'generated',
        title: 'Generated data',
        lead: 'Variables that are made up when the request is sent. Handy for fixtures, forms and load of realistic-looking data.',
        blocks: [
          { p: 'Write one between braces — `{{$randomEmail}}` — and it becomes a fresh value on every send. **Each occurrence gets its own value**, so two `{{$randomFullName}}` in one body are two different people. That is what sets a generator apart from a variable.' },
          {
            ul: [
              'The names match Postman’s, so a collection that used them keeps working.',
              'Names, cities, streets and phone numbers follow the **language of the interface**. Identifiers, numbers and dates have no language and never change.',
              'To fix the language independently — an API that validates addresses in English, read by someone working in Portuguese — set **Generated data** in **Settings → General**.',
              'A variable you define with the same name wins over the generator.',
              'A misspelt generator stays red, which is the case worth noticing.',
            ],
          },
          { generators: true },
          { note: 'In the app, the same list opens from the command palette or from the environments screen; click a row to copy it ready to paste.', kind: 'info' },
        ],
      },
      {
        id: 'scripts',
        title: 'Scripts',
        lead: 'JavaScript that runs before a request is sent or after its response arrives.',
        blocks: [
          { p: 'Put a script on a **request** or on a **folder**. A folder’s scripts wrap every request inside it: pre-request scripts run from the outermost folder inward, post-response scripts from the innermost outward.' },
          {
            table: {
              head: ['Call', 'What it does'],
              rows: [
                ['`carom.get(name)`', 'Reads a variable, including ones set earlier in the same chain.'],
                ['`carom.set(name, value)`', 'Writes a variable into the active environment once the script finishes.'],
                ['`carom.header(key, value)`', 'Adds a header to the outgoing request (pre-request only).'],
                ['`carom.json()`', 'The response body parsed as JSON, or `null` (post-response).'],
                ['`carom.request` · `carom.response`', 'The request being sent, and the response that came back.'],
                ['`console.log(…)`', 'Written to the response’s Console tab.'],
              ],
            },
          },
          { code: '// Post-response script: keep the token for the next request\nconst body = carom.json();\nif (body && body.token) carom.set("token", body.token);' },
          { p: 'Postman’s `pm` object works too, including `pm.test`, so scripts from an imported collection run unchanged.' },
          { note: 'Scripts are not sandboxed. They run with everything the app can reach, the network included. Treat a script that arrived with an imported collection as code from whoever wrote it.', kind: 'warn' },
        ],
      },
      {
        id: 'response',
        title: 'Reading a response',
        blocks: [
          {
            ul: [
              '**Pretty** collapses and expands JSON; **Raw** is exactly what came back; **Preview** renders HTML.',
              '**Highlight in body** finds text and marks every match.',
              '**Headers**, **Cookies** and **Console** (script output and `pm.test` results) have their own tabs.',
              '**History** keeps the last 15 responses of each request. Click one to look at it again.',
              'Copy the response, or save it to a file, with the buttons above the body.',
              'When a response arrives for a request in another tab, a toast tells you.',
            ],
          },
          { p: 'To hand a request to someone as a command, use **Copy as curl** beside the URL bar. It is written with your variables already filled in — and with generated values, if the body has any. **Copy URL** gives you the resolved URL.' },
        ],
      },
      {
        id: 'import-export',
        title: 'Importing and exporting',
        blocks: [
          { h3: 'Import', id: 'import' },
          { p: 'Use **Import** at the bottom of the sidebar. Carom reads Carom exports, **Postman** collections and environments, **Insomnia** v4 and v5, **OpenAPI / Swagger**, **HAR** files and pasted **curl** commands. For Postman you choose what to bring in and where it goes, environments included. Anything that does not come across — an Insomnia gRPC request, say — is listed before you confirm.' },
          { h3: 'Export', id: 'export' },
          { p: 'Use **Export** for a workspace, a folder (with its subfolders and requests) or a single request, in Carom’s format or as **OpenAPI 3.1**. Choose the slice — environments included — and where to save it.' },
          { note: 'There is no Postman export. Carom’s format and OpenAPI 3.1 are the ways out, alongside copying a request as curl.', kind: 'info' },
        ],
      },
      {
        id: 'share',
        title: 'Sharing a workspace with a team',
        lead: 'Desktop app only.',
        blocks: [
          { p: 'From the workspace menu choose **Keep this workspace in a folder** and pick a folder in your project. An empty folder takes the workspace as it is; a folder that already holds one replaces the workspace with what is in it.' },
          {
            ul: [
              'One request per file: two people adding different requests change different files, and git merges them without asking.',
              'Folders, requests and environments go in the folder. Responses, unsaved edits and saved versions stay on your machine.',
              'Variable **names** always travel. **Values** travel only where you say so — the next screen asks, and anything that looks like a credential starts switched off.',
              'Changes are written a moment after you stop typing, and only the files that differ.',
              'If the folder changes under you — after `git pull` with the app open — Carom stops writing and says so. Reload from disk and carry on.',
            ],
          },
        ],
      },
      {
        id: 'shortcuts',
        title: 'Keyboard shortcuts',
        lead: 'The defaults. Every one can be changed under **Settings → General → Keyboard shortcuts**.',
        blocks: [
          { shortcuts: true },
          { h3: 'In the code editors', id: 'editor-keys' },
          {
            table: {
              head: ['Key', 'What it does'],
              rows: [
                ['[[Tab]] · [[Shift+Tab]]', 'Indent and outdent by two spaces.'],
                ['Typing `{` `[` or `"`', 'Adds the closing one and puts the cursor between. In XML, `<` closes too.'],
                ['Select, then type an opener', 'Wraps the selection instead of replacing it.'],
                ['Typing a closer', 'Steps over one that is already there.'],
                ['[[Backspace]] between a pair', 'Deletes both.'],
                ['[[Enter]] in the URL field', 'Sends the request.'],
              ],
            },
          },
        ],
      },
      {
        id: 'customise',
        title: 'Themes, colours and language',
        blocks: [
          {
            ul: [
              '**Settings → General**: the interface language (English, Português, Español — it follows your system until you choose), the language of generated data, pane layout, timeout, redirects, and **Keyboard shortcuts**.',
              '**Settings → Theme**: dark or light, five built-in palettes (Carom, Midnight, Ember, Forest, Paper), and fonts with their size. Change any colour of a built-in palette and it becomes your own copy; **Surprise me** shuffles a new one.',
              'On the desktop, **Settings → General → Updates** checks for a new version, and lets you choose whether Carom checks by itself when it starts.',
            ],
          },
        ],
      },
      {
        id: 'help',
        title: 'When something is off',
        blocks: [
          {
            table: {
              head: ['Symptom', 'Why, and what to do'],
              rows: [
                ['macOS says it cannot verify Carom', 'Expected: the app is not signed with a paid certificate. Run `xattr -cr /Applications/Carom.app` once, or use **Open Anyway** in System Settings → Privacy & Security.'],
                ['Windows says it protected your PC', 'SmartScreen, for the same reason. **More info → Run anyway**.'],
                ['A request fails in the browser build but not in the app', 'A browser enforces CORS and cannot reach `localhost`. The desktop app has neither limit.'],
                ['A variable shows in red', 'It is not defined in the folder, the active environment or the base. Hover it to define it, or check the environment picker.'],
                ['Installed from `.deb` or `.rpm` and there is no update button', 'Those belong to your package manager. Carom links to the release page instead.'],
                ['Linked folder says it changed on disk', 'Something — usually `git pull` — moved it. Reload from disk; your edits since are the ones to check.'],
              ],
            },
          },
          { p: 'Found something else? [Open an issue](https://github.com/lucasdias1707/carom-client-api/issues) and say what you did, what you expected and what happened.' },
        ],
      },
    ],
  },
};
