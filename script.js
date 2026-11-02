'use strict';

let toastTimer;

const KEY = 'sever-logistics-v1';

const seed = {
  transport: [
    {
      id: 'ТС-001',
      name: 'Арктика',
      type: 'Судно обеспечения',
      capacity: 3200,
      location: 'Кольский залив',
      status: 'В рейсе'
    },
    {
      id: 'ТС-002',
      name: 'Полярный вектор',
      type: 'Сухогруз',
      capacity: 5000,
      location: 'Причал № 4',
      status: 'Погрузка'
    },
    {
      id: 'ТС-003',
      name: 'MAN TGS 33.480',
      type: 'Автотранспорт',
      capacity: 40,
      location: 'База Мурманск',
      status: 'Готов'
    },
    {
      id: 'ТС-004',
      name: 'Liebherr LTM',
      type: 'Спецтехника',
      capacity: 100,
      location: 'Причал № 2',
      status: 'Ремонт'
    },
    {
      id: 'ТС-005',
      name: 'Помор',
      type: 'Судно обеспечения',
      capacity: 1800,
      location: 'Архангельск',
      status: 'Готов'
    }
  ],

  cargo: [
    {
      id: 'МТР-101',
      name: 'Буровой двигатель 178 мм',
      category: 'Оборудование',
      weight: 3.8,
      warehouse: 'Береговой А',
      handling: 'Стандартные условия'
    },
    {
      id: 'МТР-102',
      name: 'Обсадные трубы 245 мм',
      category: 'Трубный прокат',
      weight: 84,
      warehouse: 'Открытая площадка',
      handling: 'Крепление длинномерного груза'
    },
    {
      id: 'МТР-103',
      name: 'Насос НС-200',
      category: 'Оборудование',
      weight: 12.4,
      warehouse: 'Береговой А',
      handling: 'Защита от влаги'
    },
    {
      id: 'МТР-104',
      name: 'Запасные части и инструменты',
      category: 'Комплектующие',
      weight: 8,
      warehouse: 'Склад № 3',
      handling: 'Стандартные условия'
    }
  ],

  routes: [
    {
      id: 'М-01',
      name: 'Приразломное направление',
      from: 'Мурманск',
      to: 'Платформа Приразломная',
      distance: 1080,
      hours: 52,
      type: 'Морской'
    },
    {
      id: 'М-02',
      name: 'Снабжение буровой А-3',
      from: 'Архангельск',
      to: 'Буровая А-3',
      distance: 720,
      hours: 38,
      type: 'Морской'
    },
    {
      id: 'М-03',
      name: 'Береговая доставка',
      from: 'База Мурманск',
      to: 'Причал № 4',
      distance: 18,
      hours: 1,
      type: 'Автомобильный'
    }
  ],

  requests: [
    {
      id: 'З-1001',
      route: 'М-01',
      cargo: 'МТР-101',
      weight: 3.8,
      transport: 'ТС-001',
      priority: 'Высокий',
      status: 'В пути',
      date: '2026-10-15'
    },
    {
      id: 'З-1002',
      route: 'М-03',
      cargo: 'МТР-104',
      weight: 8,
      transport: 'ТС-003',
      priority: 'Обычный',
      status: 'Погрузка',
      date: '2026-10-15'
    },
    {
      id: 'З-1003',
      route: 'М-01',
      cargo: 'МТР-103',
      weight: 12.4,
      transport: '',
      priority: 'Аварийный',
      status: 'Новая',
      date: '2026-10-16'
    },
    {
      id: 'З-1004',
      route: 'М-02',
      cargo: 'МТР-102',
      weight: 84,
      transport: 'ТС-005',
      priority: 'Обычный',
      status: 'Согласована',
      date: '2026-10-17'
    },
    {
      id: 'З-1005',
      route: 'М-03',
      cargo: 'МТР-104',
      weight: 4,
      transport: 'ТС-003',
      priority: 'Обычный',
      status: 'Доставлена',
      date: '2026-10-14'
    }
  ]
};

let db;
let storageAvailable = true;

try {
  const raw = localStorage.getItem(KEY);
  db = raw ? JSON.parse(raw) : structuredClone(seed);
  validateDB(db);
} catch (error) {
  db = structuredClone(seed);
  toast(
    'Хранилище недоступно или повреждено. Загружены демонстрационные данные.'
  );
}

const pages = {
  overview: 'Обзор',
  requests: 'Заявки на перевозку',
  transport: 'Транспорт и флот',
  cargo: 'Грузы и МТР',
  routes: 'Маршруты'
};

let pageName = 'overview';
let query = '';
let filter = '';
let editing = null;

const $ = selector => document.querySelector(selector);

const escapeHTML = value => String(value ?? '').replace(
  /[&<>"']/g,
  character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character])
);

const e = escapeHTML;

const number = value => new Intl.NumberFormat(
  'ru-RU',
  { maximumFractionDigits: 1 }
).format(value);

const today = () => new Date().toLocaleDateString('en-CA');

function validateDB(data) {
  for (const key of ['transport', 'cargo', 'routes', 'requests']) {
    if (!Array.isArray(data[key]) || data[key].length > 10000) {
      throw Error('Некорректная структура данных');
    }

    const ids = new Set();

    for (const row of data[key]) {
      if (
        !row ||
        typeof row.id !== 'string' ||
        ids.has(row.id)
      ) {
        throw Error('Повторяющийся или неверный идентификатор');
      }

      ids.add(row.id);
    }
  }

  for (const route of data.routes) {
    if (
      !route.name ||
      !route.from ||
      !route.to ||
      !(+route.distance > 0) ||
      !(+route.hours > 0)
    ) {
      throw Error('Некорректный маршрут');
    }
  }

  for (const cargo of data.cargo) {
    if (
      !cargo.name ||
      !(+cargo.weight > 0) ||
      !cargo.category ||
      !cargo.warehouse
    ) {
      throw Error('Некорректный груз');
    }
  }

  for (const transport of data.transport) {
    if (
      !transport.name ||
      !(+transport.capacity > 0) ||
      !transport.type ||
      !transport.location ||
      !['Готов', 'В рейсе', 'Погрузка', 'Ремонт'].includes(
        transport.status
      )
    ) {
      throw Error('Некорректный транспорт');
    }
  }

  for (const request of data.requests) {
    if (
      !data.routes.some(item => item.id === request.route) ||
      !data.cargo.some(item => item.id === request.cargo) ||
      (
        request.transport &&
        !data.transport.some(item => item.id === request.transport)
      ) ||
      !(+request.weight > 0) ||
      ![
        'Новая',
        'Согласована',
        'Погрузка',
        'В пути',
        'Доставлена',
        'Отменена'
      ].includes(request.status) ||
      !['Обычный', 'Высокий', 'Аварийный'].includes(
        request.priority
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(request.date)
    ) {
      throw Error('Некорректная заявка или нарушены связи');
    }
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;

    toast(
      'Не удалось сохранить данные. Проверьте доступ к хранилищу браузера.'
    );

    return false;
  }
}

function toast(text) {
  const element = document.getElementById('toast');

  if (!element) return;

  element.textContent = text;
  element.classList.add('visible');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => element.classList.remove('visible'),
    3600
  );
}

function lookup(key, id) {
  return db[key].find(item => item.id === id);
}

function activeRequests() {
  return db.requests.filter(
    request => !['Доставлена', 'Отменена'].includes(request.status)
  );
}

function badge(status) {
  const className = ({
    'Готов': 'green',
    'Доставлена': 'green',
    'Согласована': 'green',
    'В рейсе': 'blue',
    'В пути': 'blue',
    'Новая': 'orange',
    'Погрузка': 'orange',
    'Ремонт': 'red',
    'Отменена': 'red'
  })[status] || '';

  return `<span class="badge ${className}">${e(status)}</span>`;
}

function priority(value) {
  const className = value === 'Аварийный'
    ? 'urgent'
    : value === 'Высокий'
      ? 'high'
      : '';

  return `<span class="priority ${className}">${e(value)}</span>`;
}

function head(title, description, buttons = '') {
  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">ОПЕРАЦИОННЫЙ ЦЕНТР</div>
        <h1>${title}</h1>
        <p class="subtitle">${description}</p>
      </div>
      <div class="actions">${buttons}</div>
    </div>
  `;
}

function addButton(label) {
  return `
    <button class="button primary" data-action="add">
      ＋ ${label}
    </button>
  `;
}

function exportButton() {
  return `
    <button class="button secondary" data-action="export">
      ↓ Выгрузить CSV
    </button>
  `;
}

function mapView(big = false) {
  return `
    <div class="map" ${big ? 'style="height:380px"' : ''}>
      <svg
        viewBox="0 0 650 300"
        role="img"
        aria-label="Условная схема морских и береговых маршрутов снабжения"
      >
        <defs>
          <pattern
            id="grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#dce7e3"
              stroke-width=".6"
            />
          </pattern>
        </defs>

        <rect width="650" height="300" fill="url(#grid)" />

        <path
          d="M0 0H110L145 40 125 65 170 95 165 120 215 155 225 190 280 210 315 270 340 300H0Z"
          fill="#dce7de"
        />

        <path
          d="M0 0H110L145 40 125 65 170 95 165 120 215 155 225 190 280 210 315 270 340 300"
          fill="none"
          stroke="#c8d9ce"
          stroke-width="2"
        />

        <text
          x="365"
          y="45"
          font-size="13"
          letter-spacing="3"
          fill="#9ab1ad"
        >
          БАРЕНЦЕВО МОРЕ
        </text>

        <path
          d="M165 120 Q290 35 490 115"
          stroke="#279981"
          stroke-width="2"
          stroke-dasharray="6 5"
          fill="none"
        />

        <path
          d="M260 245 Q400 250 540 215"
          stroke="#94ada6"
          stroke-width="2"
          stroke-dasharray="6 5"
          fill="none"
        />

        <circle
          cx="165"
          cy="120"
          r="7"
          fill="#087f74"
          stroke="white"
          stroke-width="3"
        />

        <circle
          cx="490"
          cy="115"
          r="7"
          fill="#d19b47"
          stroke="white"
          stroke-width="3"
        />

        <circle
          cx="260"
          cy="245"
          r="6"
          fill="#087f74"
          stroke="white"
          stroke-width="3"
        />

        <circle
          cx="540"
          cy="215"
          r="6"
          fill="#d19b47"
          stroke="white"
          stroke-width="3"
        />

        <circle cx="328" cy="86" r="14" fill="#fff" />

        <path
          d="M320 88h16l-4 5h-8zM324 82h7v6h-7z"
          fill="#087f74"
        />

        <text class="map-label" x="90" y="146">Мурманск</text>
        <text class="map-small" x="89" y="161">База снабжения</text>

        <text class="map-label" x="460" y="140">
          Приразломная
        </text>

        <text class="map-small" x="461" y="155">
          Морская платформа
        </text>

        <text class="map-label" x="165" y="230">
          Архангельск
        </text>

        <text class="map-label" x="510" y="240">Буровая А-3</text>
        <text class="map-small" x="305" y="113">Арктика</text>
      </svg>

      <div class="map-legend">
        <span>
          <i class="legend-dot"></i>
          База снабжения
        </span>

        <span>
          <i class="legend-dot gold"></i>
          Объект
        </span>

        <span>Условная схема · без GPS</span>
      </div>
    </div>
  `;
}

function requestRows(rows, compact = false) {
  return rows.map(request => {
    const route = lookup('routes', request.route);
    const cargo = lookup('cargo', request.cargo);
    const transport = lookup('transport', request.transport);

    return `
      <tr>
        <td>
          <span class="id">${e(request.id)}</span>
          <span class="cell-sub">
            ${e(request.date.split('-').reverse().join('.'))}
          </span>
        </td>

        <td>
          <span class="cell-main">
            ${e(route.from)} → ${e(route.to)}
          </span>

          <span class="cell-sub">
            ${e(cargo.name)} · ${number(request.weight)} т
          </span>
        </td>

        <td>${e(transport?.name || 'Не назначен')}</td>
        <td>${priority(request.priority)}</td>
        <td>${badge(request.status)}</td>

        ${compact ? '' : `
          <td>
            <button
              class="row-action"
              data-action="edit"
              data-id="${e(request.id)}"
            >
              Изменить
            </button>

            <button
              class="row-action danger"
              data-action="delete"
              data-id="${e(request.id)}"
            >
              Удалить
            </button>
          </td>
        `}
      </tr>
    `;
  }).join('');
}

function requestTable(rows, compact = false) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ЗАЯВКА / ДАТА</th>
            <th>МАРШРУТ И ГРУЗ</th>
            <th>ТРАНСПОРТ</th>
            <th>ПРИОРИТЕТ</th>
            <th>СТАТУС</th>
            ${compact ? '' : '<th>ДЕЙСТВИЯ</th>'}
          </tr>
        </thead>

        <tbody>
          ${requestRows(rows, compact)}
        </tbody>
      </table>

      ${rows.length ? '' : `
        <div class="empty">
          Записей не найдено. Измените фильтр или создайте новую запись.
        </div>
      `}
    </div>
  `;
}

function overview() {
  const active = activeRequests();
  const ready = db.transport.filter(
    transport => transport.status === 'Готов'
  ).length;

  const tons = active.reduce(
    (sum, request) => sum + Number(request.weight),
    0
  );

  return head(
    'Логистика под контролем',
    'Планируйте снабжение. Управляйте перевозками. Держите всё в поле зрения.',
    `
      <button class="button secondary" data-action="backup">
        ↓ Резервная копия
      </button>

      <button class="button primary" data-action="new-request">
        ＋ Новая заявка
      </button>
    `
  ) + `
    <div class="kpis">
      <div class="kpi">
        <span class="kpi-icon">⌁</span>
        <div class="kpi-label">Активные перевозки</div>

        <div class="kpi-value">
          ${active.length.toString().padStart(2, '0')}
        </div>

        <div class="kpi-foot">
          <span class="positive">
            ${db.requests.filter(
              request => request.status === 'В пути'
            ).length} в пути
          </span>
          · остальные в подготовке
        </div>
      </div>

      <div class="kpi">
        <span class="kpi-icon">▱</span>
        <div class="kpi-label">Готовность транспорта</div>

        <div class="kpi-value">
          ${ready}
          <span style="font-size:19px;color:#a6b4b9">
            / ${db.transport.length}
          </span>
        </div>

        <div class="kpi-foot">Единиц готовы к назначению</div>
      </div>

      <div class="kpi">
        <span class="kpi-icon">▦</span>
        <div class="kpi-label">Грузов в работе</div>

        <div class="kpi-value">
          ${number(tons)}
          <span style="font-size:15px;margin-left:6px;color:#94a5ac">
            т
          </span>
        </div>

        <div class="kpi-foot">Масса по активным заявкам</div>
      </div>

      <div class="kpi">
        <span class="kpi-icon">≡</span>
        <div class="kpi-label">Ожидают согласования</div>

        <div class="kpi-value">
          ${db.requests.filter(
            request => request.status === 'Новая'
          ).length.toString().padStart(2, '0')}
        </div>

        <div class="kpi-foot amber">
          ${db.requests.filter(
            request =>
              request.status === 'Новая' &&
              request.priority === 'Аварийный'
          ).length} с аварийным приоритетом
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <h2>География снабжения</h2>
          <small>Северо-Западный регион</small>
        </div>

        ${mapView()}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Перевозки в работе</h2>
          <span class="small-chip">${active.length} заявки</span>
        </div>

        <div class="panel-content">
          ${active.slice(0, 4).map(request => {
            const route = lookup('routes', request.route);

            const percent = ({
              'Новая': 10,
              'Согласована': 30,
              'Погрузка': 50,
              'В пути': 75
            })[request.status] || 0;

            return `
              <div class="route-item">
                <div class="route-title">
                  <b>${e(request.id)}</b>
                  ${badge(request.status)}
                </div>

                <div class="route-info">
                  ${e(route.from)} → ${e(route.to)}
                </div>

                <div class="progress">
                  <span style="width:${percent}%"></span>
                </div>
              </div>
            `;
          }).join('') || `
            <div class="empty">Нет активных перевозок</div>
          `}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Последние заявки</h2>

        <button class="text-button" data-action="all-requests">
          Все заявки →
        </button>
      </div>

      ${requestTable(db.requests.slice().reverse().slice(0, 5), true)}

      <div class="about-strip">
        <span>
          Учебные данные · показатели рассчитываются по заявкам
        </span>

        <button
          class="text-button row-action"
          data-action="restore"
        >
          Восстановить из копии
        </button>

        <input
          class="backup-input"
          type="file"
          id="restore-file"
          accept="application/json"
        >
      </div>
    </section>
  `;
}

function toolbar(statuses) {
  return `
    <div class="toolbar">
      <div class="filters">
        <label class="search">
          <input
            id="search"
            aria-label="Поиск по таблице"
            placeholder="Поиск по записям…"
            value="${e(query)}"
          >
        </label>

        <select id="status-filter" aria-label="Фильтр">
          <option value="">
            Все ${pageName === 'cargo' ? 'категории' : 'статусы'}
          </option>

          ${statuses.map(status => `
            <option ${filter === status ? 'selected' : ''}>
              ${e(status)}
            </option>
          `).join('')}
        </select>
      </div>

      <span class="subtitle">
        ${pageName === 'requests' ? 'Реестр перевозок' : 'Справочник'}
      </span>
    </div>
  `;
}

function filtered(rows) {
  return rows.filter(row => {
    const directMatch = JSON.stringify(row)
      .toLowerCase()
      .includes(query.toLowerCase());

    const relatedMatch = pageName === 'requests' && [
      lookup('routes', row.route)?.from,
      lookup('routes', row.route)?.to,
      lookup('cargo', row.cargo)?.name,
      lookup('transport', row.transport)?.name
    ].join(' ').toLowerCase().includes(query.toLowerCase());

    return directMatch || relatedMatch;
  }).filter(
    row => !filter || (row.status || row.category) === filter
  );
}

function listing() {
  const rows = filtered(db[pageName]);

  const info = {
    requests: [
      'Заявки на перевозку',
      'Единый реестр снабжения объектов и движения грузов.',
      'Создать заявку'
    ],
    transport: [
      'Транспорт и флот',
      'Контроль доступности судов, автотранспорта и специальной техники.',
      'Добавить транспорт'
    ],
    cargo: [
      'Грузы и МТР',
      'Номенклатура материально-технических ресурсов и условия перевозки.',
      'Добавить груз'
    ]
  }[pageName];

  let table;

  if (pageName === 'requests') {
    table = requestTable(rows);
  } else {
    const headings = pageName === 'transport'
      ? [
          'КОД',
          'ТРАНСПОРТ / ТИП',
          'ГРУЗОПОДЪЁМНОСТЬ',
          'РАСПОЛОЖЕНИЕ',
          'СОСТОЯНИЕ',
          'ДЕЙСТВИЯ'
        ]
      : [
          'АРТИКУЛ',
          'НАИМЕНОВАНИЕ / КАТЕГОРИЯ',
          'МАССА',
          'СКЛАД',
          'УСЛОВИЯ ПЕРЕВОЗКИ',
          'ДЕЙСТВИЯ'
        ];

    table = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${headings.map(
                heading => `<th>${heading}</th>`
              ).join('')}
            </tr>
          </thead>

          <tbody>
            ${rows.map(row => `
              <tr>
                <td class="id">${e(row.id)}</td>

                <td>
                  <span class="cell-main">${e(row.name)}</span>
                  <span class="cell-sub">
                    ${e(row.type || row.category)}
                  </span>
                </td>

                <td>${number(row.capacity || row.weight)} т</td>
                <td>${e(row.location || row.warehouse)}</td>

                <td>
                  ${pageName === 'transport'
                    ? badge(row.status)
                    : e(row.handling)}
                </td>

                <td>
                  <button
                    class="row-action"
                    data-action="edit"
                    data-id="${e(row.id)}"
                  >
                    Изменить
                  </button>

                  <button
                    class="row-action danger"
                    data-action="delete"
                    data-id="${e(row.id)}"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${rows.length ? '' : `
          <div class="empty">Записей не найдено</div>
        `}
      </div>
    `;
  }

  const statuses = pageName === 'requests'
    ? [
        'Новая',
        'Согласована',
        'Погрузка',
        'В пути',
        'Доставлена',
        'Отменена'
      ]
    : pageName === 'transport'
      ? ['Готов', 'В рейсе', 'Погрузка', 'Ремонт']
      : [...new Set(db.cargo.map(item => item.category))];

  return head(
    info[0],
    info[1],
    exportButton() + addButton(info[2])
  ) + `
    <section class="panel">
      ${toolbar(statuses)}
      ${table}

      <div class="section-meta">
        <span>
          Показано ${rows.length} из ${db[pageName].length}
        </span>

        <span>Сохраняется в браузере</span>
      </div>
    </section>
  ` + (
    pageName === 'requests'
      ? `
        <p class="note">
          Этапы обработки: новая → согласована → погрузка →
          в пути → доставлена. Прогресс в сводке отражает этап,
          а не фактическое местоположение транспорта.
        </p>
      `
      : ''
  );
}

function routesPage() {
  return head(
    'Маршруты снабжения',
    'Направления перевозок и плановые параметры доставки.',
    exportButton() + addButton('Добавить маршрут')
  ) + `
    <section class="panel">
      <div class="panel-head">
        <h2>Схема региона</h2>
        <small>Условное расположение объектов</small>
      </div>

      ${mapView(true)}
    </section>

    <div class="routes-grid">
      ${db.routes.map(route => `
        <section class="panel route-card">
          <span class="small-chip">
            ${e(route.id)} · ${e(route.type)}
          </span>

          <h2>${e(route.name)}</h2>

          <div class="route-path">
            ${e(route.from)} → ${e(route.to)}
          </div>

          <div class="route-metrics">
            <div>
              <b>${number(route.distance)}</b>
              <small>километров · план</small>
            </div>

            <div>
              <b>${number(route.hours)}</b>
              <small>часов · план</small>
            </div>
          </div>

          <div class="actions">
            <button
              class="row-action"
              data-action="edit"
              data-id="${e(route.id)}"
            >
              Изменить маршрут
            </button>

            <button
              class="row-action danger"
              data-action="delete"
              data-id="${e(route.id)}"
            >
              Удалить
            </button>
          </div>
        </section>
      `).join('')}
    </div>

    <p class="note">
      Схема иллюстрирует исходные направления.
      Добавленные маршруты доступны в карточках и заявках.
      Расстояния и время — учебные плановые значения,
      не навигационные данные.
    </p>
  `;
}

function render() {
  const hash = location.hash.slice(1);

  pageName = pages[hash] ? hash : 'overview';

  $('#crumb').textContent = pages[pageName];
  document.title = pages[pageName] + ' — Север';

  document.querySelectorAll('nav button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.page === pageName
    );
  });

  $('#nav-count').textContent = db.requests.filter(
    request => request.status === 'Новая'
  ).length;

  $('#main').innerHTML = pageName === 'overview'
    ? overview()
    : pageName === 'routes'
      ? routesPage()
      : listing();
}

const specs = {
  transport: [
    ['name', 'Наименование', 'text'],
    [
      'type',
      'Тип транспорта',
      [
        'Судно обеспечения',
        'Сухогруз',
        'Автотранспорт',
        'Спецтехника'
      ]
    ],
    ['capacity', 'Грузоподъёмность, т', 'number'],
    ['location', 'Расположение', 'text'],
    [
      'status',
      'Состояние',
      ['Готов', 'В рейсе', 'Погрузка', 'Ремонт']
    ]
  ],

  cargo: [
    ['name', 'Наименование груза', 'text'],
    [
      'category',
      'Категория',
      [
        'Оборудование',
        'Трубный прокат',
        'Комплектующие',
        'Материалы',
        'Химреагенты'
      ]
    ],
    ['weight', 'Масса партии, т', 'number'],
    ['warehouse', 'Склад', 'text'],
    ['handling', 'Условия перевозки', 'text']
  ],

  routes: [
    ['name', 'Название маршрута', 'text'],
    [
      'type',
      'Вид перевозки',
      ['Морской', 'Автомобильный', 'Смешанный']
    ],
    ['from', 'Пункт отправления', 'text'],
    ['to', 'Пункт назначения', 'text'],
    ['distance', 'Расстояние, км', 'number'],
    ['hours', 'Плановое время, ч', 'number']
  ]
};

function fieldsFor(key) {
  if (key !== 'requests') return specs[key];

  return [
    [
      'route',
      'Маршрут',
      db.routes.map(route => [
        route.id,
        route.from + ' → ' + route.to
      ])
    ],
    [
      'cargo',
      'Груз',
      db.cargo.map(cargo => [cargo.id, cargo.name])
    ],
    ['weight', 'Масса к перевозке, т', 'number'],
    ['date', 'Плановая дата', 'date'],
    [
      'transport',
      'Транспорт',
      [
        ['', 'Не назначен'],
        ...db.transport.map(transport => [
          transport.id,
          transport.name + ' · ' + transport.capacity + ' т'
        ])
      ]
    ],
    [
      'priority',
      'Приоритет',
      ['Обычный', 'Высокий', 'Аварийный']
    ],
    [
      'status',
      'Статус',
      [
        'Новая',
        'Согласована',
        'Погрузка',
        'В пути',
        'Доставлена',
        'Отменена'
      ]
    ]
  ];
}

function openEditor(key, id) {
  if (
    key === 'requests' &&
    (!db.routes.length || !db.cargo.length)
  ) {
    toast('Сначала добавьте маршрут и груз.');
    return;
  }

  editing = { key, id };

  const row = id ? lookup(key, id) : {};

  $('#dialog-title').textContent =
    (id ? 'Изменить' : 'Добавить') + ' ' + ({
      requests: 'заявку',
      transport: 'транспорт',
      cargo: 'груз',
      routes: 'маршрут'
    })[key];

  $('#form-error').textContent = '';

  $('#form-fields').innerHTML = fieldsFor(key).map(
    ([name, label, type]) => `
      <label
        class="${name === 'name' || name === 'handling' ? 'wide' : ''}"
      >
        ${label}

        ${Array.isArray(type) ? `
          <select
            name="${name}"
            ${name === 'transport' ? '' : 'required'}
          >
            ${type.map(option => {
              const [value, text] = Array.isArray(option)
                ? option
                : [option, option];

              const selected =
                String(row[name] ?? '') === String(value);

              return `
                <option
                  value="${e(value)}"
                  ${selected ? 'selected' : ''}
                >
                  ${e(text)}
                </option>
              `;
            }).join('')}
          </select>
        ` : `
          <input
            name="${name}"
            type="${type}"
            value="${e(
              row[name] ?? (type === 'date' ? today() : '')
            )}"
            ${type === 'number'
              ? 'min="0.1" max="10000000" step="0.1"'
              : 'maxlength="140"'}
            required
          >
        `}
      </label>
    `
  ).join('');

  $('#editor').showModal();
}

function nextId(key) {
  const prefix = {
    requests: 'З-',
    transport: 'ТС-',
    cargo: 'МТР-',
    routes: 'М-'
  }[key];

  const max = Math.max(
    key === 'requests' ? 1000 : key === 'cargo' ? 100 : 0,
    ...db[key].map(
      row => Number(row.id.replace(/\D/g, '')) || 0
    )
  );

  return prefix + String(max + 1).padStart(
    key === 'transport' ? 3 : 2,
    '0'
  );
}

$('#edit-form').addEventListener('submit', event => {
  event.preventDefault();

  const { key, id } = editing;
  const fields = fieldsFor(key);

  const value = Object.fromEntries(
    new FormData(event.target)
  );

  for (const [name, , type] of fields) {
    value[name] = type === 'number'
      ? Number(value[name])
      : String(value[name] ?? '').trim();

    if (
      name !== 'transport' &&
      (
        value[name] === '' ||
        (type === 'number' && !(value[name] > 0))
      )
    ) {
      $('#form-error').textContent =
        'Заполните поля корректными значениями.';

      return;
    }
  }

  if (key === 'requests') {
    const transport = lookup('transport', value.transport);

    if (transport && value.weight > transport.capacity) {
      $('#form-error').textContent =
        'Масса груза превышает грузоподъёмность выбранного транспорта.';

      return;
    }

    if (
      transport &&
      transport.status === 'Ремонт' &&
      !['Доставлена', 'Отменена'].includes(value.status)
    ) {
      $('#form-error').textContent =
        'Транспорт в ремонте нельзя назначить на активную заявку.';

      return;
    }

    if (
      ['Погрузка', 'В пути', 'Доставлена'].includes(value.status) &&
      !transport
    ) {
      $('#form-error').textContent =
        'Для этого этапа необходимо назначить транспорт.';

      return;
    }

    if (value.weight > lookup('cargo', value.cargo).weight) {
      $('#form-error').textContent =
        'Масса к перевозке превышает массу партии в справочнике.';

      return;
    }
  }

  const previous = structuredClone(db);

  if (id) {
    db[key] = db[key].map(
      row => row.id === id ? { ...value, id } : row
    );
  } else {
    db[key].push({
      ...value,
      id: nextId(key)
    });
  }

  try {
    validateDB(db);
  } catch (error) {
    db = previous;
    $('#form-error').textContent = error.message;
    return;
  }

  if (!save()) {
    db = previous;
    return;
  }

  $('#editor').close();
  render();

  toast(id ? 'Изменения сохранены' : 'Запись добавлена');
});

function removeRecord(id) {
  const key = pageName;

  if (key !== 'requests') {
    const field = {
      transport: 'transport',
      cargo: 'cargo',
      routes: 'route'
    }[key];

    if (db.requests.some(request => request[field] === id)) {
      toast(
        'Запись используется в заявках. Сначала измените или удалите связанные заявки.'
      );

      return;
    }
  }

  if (!confirm(
    'Удалить запись ' + id + '? Это действие нельзя отменить.'
  )) {
    return;
  }

  const old = db[key];

  db[key] = db[key].filter(row => row.id !== id);

  if (save()) {
    render();
    toast('Запись удалена');
  } else {
    db[key] = old;
  }
}

function download(content, type, name) {
  const link = document.createElement('a');

  const url = URL.createObjectURL(
    new Blob([content], { type })
  );

  link.href = url;
  link.download = name;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCSV() {
  const key = pageName;

  const rows = key === 'routes'
    ? db.routes
    : filtered(db[key]);

  if (!rows.length) {
    toast('Нет данных для выгрузки');
    return;
  }

  const labels = {
    id: 'Код',
    name: 'Наименование',
    type: 'Тип',
    capacity: 'Грузоподъёмность, т',
    location: 'Расположение',
    status: 'Статус',
    category: 'Категория',
    weight: 'Масса, т',
    warehouse: 'Склад',
    handling: 'Условия',
    from: 'Откуда',
    to: 'Куда',
    distance: 'Расстояние, км',
    hours: 'Время, ч',
    route: 'Маршрут',
    cargo: 'Груз',
    transport: 'Транспорт',
    priority: 'Приоритет',
    date: 'Дата'
  };

  const keys = Object.keys(rows[0]);

  const cell = value => '"' + String(value ?? '')
    .replace(/^[=+@\-]/, "'$&")
    .replace(/"/g, '""') + '"';

  const csv = [
    keys.map(
      key => cell(labels[key] || key)
    ).join(';'),

    ...rows.map(row => keys.map(key => {
      let value;

      if (key === 'route') {
        value = lookup('routes', row[key])?.name;
      } else if (key === 'cargo') {
        value = lookup('cargo', row[key])?.name;
      } else if (key === 'transport') {
        value = lookup('transport', row[key])?.name || 'Не назначен';
      } else {
        value = row[key];
      }

      return cell(value);
    }).join(';'))
  ].join('\r\n');

  download(
    '\ufeff' + csv,
    'text/csv;charset=utf-8',
    'Север_' + key + '.csv'
  );

  toast('CSV сформирован');
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-page]');

  if (nav) {
    query = '';
    filter = '';
    location.hash = nav.dataset.page;
    return;
  }

  const button = event.target.closest('[data-action]');

  if (!button) return;

  const action = button.dataset.action;

  if (action === 'add') {
    openEditor(pageName);
  }

  if (action === 'edit') {
    openEditor(pageName, button.dataset.id);
  }

  if (action === 'delete') {
    removeRecord(button.dataset.id);
  }

  if (action === 'new-request') {
    openEditor('requests');
  }

  if (action === 'all-requests') {
    query = '';
    filter = '';
    location.hash = 'requests';
  }

  if (action === 'export') {
    exportCSV();
  }

  if (action === 'backup') {
    download(
      JSON.stringify(
        {
          format: 'sever-v1',
          exportedAt: new Date().toISOString(),
          data: db
        },
        null,
        2
      ),
      'application/json',
      'Север_резервная_копия.json'
    );
  }

  if (action === 'restore') {
    $('#restore-file').click();
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'search') {
    const position = event.target.selectionStart;

    query = event.target.value;
    render();

    $('#search').focus();
    $('#search').setSelectionRange(position, position);
  }
});

document.addEventListener('change', async event => {
  if (event.target.id === 'status-filter') {
    filter = event.target.value;
    render();
  }

  if (event.target.id === 'restore-file') {
    const file = event.target.files[0];

    if (!file) return;

    try {
      if (file.size > 5e6) {
        throw Error('Файл больше 5 МБ');
      }

      const parsed = JSON.parse(await file.text());

      if (parsed.format !== 'sever-v1') {
        throw Error('Неверный формат копии');
      }

      validateDB(parsed.data);

      if (!confirm(
        'Заменить текущие данные резервной копией?'
      )) {
        return;
      }

      const old = db;
      db = parsed.data;

      if (save()) {
        render();
        toast('Данные восстановлены');
      } else {
        db = old;
      }
    } catch (error) {
      toast('Не удалось восстановить: ' + error.message);
    }
  }
});

$('#close-dialog').onclick = () => {
  $('#editor').close();
};

$('#cancel-dialog').onclick = () => {
  $('#editor').close();
};

window.addEventListener('hashchange', () => {
  query = '';
  filter = '';
  render();
});

window.addEventListener('storage', event => {
  if (event.key !== KEY) return;

  try {
    const next = JSON.parse(event.newValue);
    validateDB(next);

    db = next;
    render();

    toast('Данные обновлены из другой вкладки');
  } catch {
    toast('Не удалось прочитать изменения из другой вкладки');
  }
});

$('#today').textContent = new Intl.DateTimeFormat(
  'ru-RU',
  {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }
).format(new Date());

render();