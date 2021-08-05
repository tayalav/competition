function equalPixelCoords(a, b) {
  const EPSILON = 1;
  return Math.abs(a[0] - b[0]) < EPSILON
    && Math.abs(a[1] - b[1]) < EPSILON
}

function createMapPositionSync(dstMap) {
  return function (e) {
    const zoom = e.get('newZoom');
    const center = e.get('newGlobalPixelCenter');
    const currZoom = dstMap.getZoom();
    const currCenter = dstMap.getGlobalPixelCenter();

    if (zoom != currZoom || !equalPixelCoords(center, currCenter)) {
      dstMap.setGlobalPixelCenter(center, zoom);
    }
  };
};

const MAP_TYPE_NAME = 'user#map';

function createMap(mapName, layerName, layerUrlTemplate, bgUrlTemplate, center, zoom) {
  layers = [layerName]
  ymaps.layer.storage.add(
      layerName,
      function () {
        let layer = new ymaps.Layer(layerUrlTemplate, {tileTransparent: true});
        layer.getZoomRange = () => ymaps.vow.resolve([0, 21]);
        return layer;
      });

  if (bgUrlTemplate != '') {
    layers = [layerName + "_bg", layerName]
    ymaps.layer.storage.add(
        layerName + "_bg",
        function () {
          let layer = new ymaps.Layer(bgUrlTemplate, {tileTransparent: true});
          layer.getZoomRange = () => ymaps.vow.resolve([0, 21]);
          return layer;
        });
  }

  const mapType = new ymaps.MapType(MAP_TYPE_NAME, layers);
  ymaps.mapType.storage.add(MAP_TYPE_NAME, mapType);

  return new ymaps.Map(
      mapName, {
        center: center,
        zoom: zoom,
        controls: [],
        type: mapType
      });
};

const MAP_PARAMS = [
  {
    tileUrl: 'https://vec.maps.yandex.net/tiles?l=map&x=%x&y=%y&z=%z&lang=ru_RU',
    title: 'PRODUCTION',
  }, {
    tileUrl: 'https://core-renderer-tilesgen.testing.maps.yandex.net/tiles?l=map&x=%x&y=%y&z=%z&lang=ru_RU',
    title: 'TESTING',
  }, {
    tileUrl: 'https://core-renderer-tilesgen.datatesting.maps.yandex.net/tiles?l=map&x=%x&y=%y&z=%z&lang=ru_RU',
    title: 'PRODUCTION DATA_TST',
  }, {
    tileUrl: 'https://core-renderer-tilesgen-datatesting.testing.maps.n.yandex.ru/tiles?l=map&x=%x&y=%y&z=%z&lang=ru_RU',
    title: 'TESTING DATA_TST',
  },
];

function cellId(index) {
  row = Math.trunc(index / 2);
  col = index % 2;
  return row + '_' + col;
}

function layerId(index)        { return 'user#layer_'    + cellId(index); }
function mapId(index)          { return 'map_'           + cellId(index); }
function mapContainerId(index) { return 'map_container_' + cellId(index); }
function mapTitleId(index)     { return 'map_title_'     + cellId(index); }

let g_params = {
  ll: [35.94, 9.67],
  z: 1,
  numSplits: 2,
  mapTitles: MAP_PARAMS.map(p => p.title),
  layerUrlTemplates: MAP_PARAMS.map(p => p.tileUrl),
  bgUrlTemplates: ['', '', '', ''],
};

function updateParamsFromLocation() {
  if (!window.location.hash) {
    return;
  }
  let kvStrings = window.location.hash.substring(1).split('!');
  for (let kv of kvStrings) {
    let isep = kv.indexOf('=');
    let k = kv.substr(0, isep);
    let v = kv.substr(isep + 1);
    if (k == 'll') {
      g_params.ll = v.split(',').map(Number);
    } else if (k == 'z') {
      g_params.z = Number(v);
    } else if (k == 'num_splits') {
      g_params.numSplits = Math.min(Math.max(0, Number(v)), 4);
    } else if (k.match(/title_[0-3]/)) {
      let index = Number(k.substring(k.length - 1));
      g_params.mapTitles[index] = decodeURIComponent(v);
    } else if (k.match(/^url_[0-3]/)) {
      let index = Number(k.substring(k.length - 1));
      g_params.layerUrlTemplates[index] = decodeURI(v);
    } else if (k.match(/^bg_url_[0-3]/)) {
      let index = Number(k.substring(k.length - 1));
      g_params.bgUrlTemplates[index] = decodeURI(v);
    }
  }
}

function updateLocationFromParams() {
  window.location.hash =
    'll=' + g_params.ll + '!' +
    'z='  + g_params.z + '!' +
    'num_splits=' + g_params.numSplits + '!' +
    'title_0=' + encodeURIComponent(g_params.mapTitles[0]) + '!' +
    'title_1=' + encodeURIComponent(g_params.mapTitles[1]) + '!' +
    'title_2=' + encodeURIComponent(g_params.mapTitles[2]) + '!' +
    'title_3=' + encodeURIComponent(g_params.mapTitles[3]) + '!' +
    'url_0=' + encodeURI(g_params.layerUrlTemplates[0]) + '!' +
    'url_1=' + encodeURI(g_params.layerUrlTemplates[1]) + '!' +
    'url_2=' + encodeURI(g_params.layerUrlTemplates[2]) + '!' +
    'url_3=' + encodeURI(g_params.layerUrlTemplates[3]) + '!' +
    'bg_url_0=' + encodeURI(g_params.bgUrlTemplates[0]) + '!' +
    'bg_url_1=' + encodeURI(g_params.bgUrlTemplates[1]) + '!' +
    'bg_url_2=' + encodeURI(g_params.bgUrlTemplates[2]) + '!' +
    'bg_url_3=' + encodeURI(g_params.bgUrlTemplates[3])
}

ymaps.ready(function () {
    updateParamsFromLocation();

    for (let index in g_params.mapTitles) {
      document.getElementById(mapTitleId(index)).innerHTML = g_params.mapTitles[index];
    }

    let splitHeight = g_params.numSplits < 3 ? 100 : 50;
    for (let index = 0; index < 4; ++index) {
      document.getElementById(mapContainerId(index)).style.height = splitHeight + "%";
    }

    for (let index = 3; index > g_params.numSplits; --index) {
      document.getElementById(mapContainerId(index)).remove();
    }

    let maps = [];
    for (idx = 0; idx < g_params.numSplits; ++idx) {
      let map = createMap(mapId(idx), layerId(idx),
                          g_params.layerUrlTemplates[idx],
                          g_params.bgUrlTemplates[idx],
                          g_params.ll, g_params.z);
      maps.push(map);
    }

    for (let m of maps) {
      for (let mm of maps) {
        if (m !== mm) {
          m.events.add('boundschange', createMapPositionSync(mm));
        }
      }
    }

    let updateState = function () {
      let zoom = maps[0].getZoom();
      let center = maps[0].getCenter();
      document.getElementById("zoom_label").innerHTML = "Zoom " + zoom;
      g_params.z = zoom;
      g_params.ll = center;
      updateLocationFromParams();
    };
    maps[0].events.add('boundschange', updateState);
    updateState();

    document.querySelectorAll('.ymaps-2-1-79-map-copyrights-promo').forEach(item => {
      item.style.display = 'none'
    });
    document.querySelectorAll('.ymaps-2-1-79-copyright__link').forEach(item => {
      item.style.display = 'none'
    });
    document.querySelectorAll('.ymaps-2-1-79-copyright__content').forEach(item => {
      item.style.display = 'none'
    });

});
