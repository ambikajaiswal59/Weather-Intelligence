import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { Extent, createEmpty, extend as olExtend } from 'ol/extent';
import { fromLonLat, transformExtent } from 'ol/proj';
import { Feature as OlFeature } from 'ol';
import { Geometry } from 'ol/geom';
import Feature from 'ol/Feature';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import { FormsModule } from '@angular/forms';
import VectorLayer from 'ol/layer/Vector';
import { Style, Circle, Fill, Stroke, Text, Icon } from 'ol/style';
import Overlay from 'ol/Overlay';
import Cluster from 'ol/source/Cluster';
import { HttpClient } from '@angular/common/http';
import { point as turfPoint, distance as turfDistance } from '@turf/turf';
import { DataService } from '../../data-service/data-service';
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import { MapExportService } from '../../shared/map-export.service';
import { WeatherService } from '../../services/weather';
import { FullScreen, Zoom } from 'ol/control';
import { defaults as olDefaultControls } from 'ol/control/defaults';
import { transform } from 'ol/proj';
declare const ol: any;

@Component({
  selector: 'app-map-weather',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './map-weather.html',
  styleUrl: './map-weather.css',
})
export class MapWeather implements AfterViewInit {
  popupElement!: HTMLElement;
  popupContent!: HTMLElement;
  popupCloser!: HTMLElement;
  popupOverlay!: Overlay;
  map!: Map;
  public riskData: any = {
    Rain: {
      VeryHeavy: { Name: 0, State: 0 },
      Heavy: { Name: 0, State: 0 },
      Moderate: { Name: 0, State: 0 },
    },
    Temperature: {
      VeryHeavy: { Name: 0, State: 0 },
      Heavy: { Name: 0, State: 0 },
      Moderate: { Name: 0, State: 0 },
    },
    Wind: {
      VeryHeavy: { Name: 0, State: 0 },
      Heavy: { Name: 0, State: 0 },
      Moderate: { Name: 0, State: 0 },
    },
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private mapExport: MapExportService,
    private dataService: DataService,
    private WeatherService: WeatherService
  ) {}
  weatherApiData: any = {};
  newTowerLayer!: VectorLayer<any>;
  newtowerSource = new VectorSource();

  teleconServicesSource = new VectorSource({
    format: new GeoJSON(),
    url: 'https://mlinfomap.org/geoserver/Telecom/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Telecom%3ARegions&outputFormat=application%2Fjson&maxFeatures=1000',
  });

  teleconServices = new VectorLayer({
    source: this.teleconServicesSource,
    style: function (feature) {
      return new Style({
        text: new Text({
          text: feature.get('RegionName'), // Change 'name' to the attribute you want to label
          font: '15px Calibri,sans-serif',
          fill: new Fill({ color: '#fff' }),
          stroke: new Stroke({ color: '#000', width: 8 }),
          overflow: true,
        }),
        stroke: new Stroke({
          color: '#0f370dff',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(200, 231, 255, 0)',
        }),
      });
    },
  });

  showZoneListDropdown: boolean = false;
  towerWeatherInfo: {
    [key: string]: {
      name: string;
      state: string;
      lat: string;
      lon: string;
      dewPoint: string;
      feelsLikeTemp: string;
      gust: string;
      heatIndex: string;
      humidity: string;
      precip: string;
      pressure: string;
      temp: string;
      uv: string;
      visibility: string;
      windDir: string;
      windSpeed: string;
      windChill: string;
      cloud: string;
      condition: string;
      dataTimeStamp: string;
    };
  } = {};
  zoneArray: any[] = ['All', 'East', 'West', 'North', 'South'];
  selectedZoneArray: any[] = [];
  showCircleListDropdown: boolean = false;
  zoneWiseState: { [zone: string]: string[] } = {
    East: ['Kolkata', 'Bhubaneswar', 'Patna', 'Guwahati'],
    West: ['Mumbai', 'Ahmedabad', 'Pune', 'Jaipur'],
    North: ['Delhi', 'Chandigarh', 'Lucknow', 'Dehradun'],
    South: ['Chennai', 'Bangalore', 'Hyderabad', 'Thiruvananthapuram'],
  };
  isIDWLayer: boolean = false;
  circleArray: any[] = [];
  selectedCircleArray: any[] = [];
  indiaExtent: any;
  initialCenter = fromLonLat([82.8320187, 25.4463565]);
  initialZoom = 10;

  minTemp: any;
  minRain: any;
  minWind: any;
  minHumidity: any;

  maxTemp: any;
  maxRain: any;
  maxWind: any;
  maxHumidity: any;

  minRange: any;
  maxRange: any;

  loading = false; // Loader flag
  private mapImage: string | null = null;

  towerIconUrl = 'assets/icons/tower.svg'; // or your own SVG

  private dataPoints: any[] = [];
  imgIDWTempLayer = new ol.layer.Image({
    title: 'IDW',
    id: 'TempIDW',
    // source: this.idw,
    opacity: 0.6,
    visible: false,
  });

  imgIDWRainFallLayer = new ol.layer.Image({
    title: 'IDW',
    id: 'RainIDW',
    opacity: 0.6,
    visible: false,
  });

  imgIDWWindLayer = new ol.layer.Image({
    title: 'IDW',
    id: 'WindIDW',
    //source: this.idw,
    opacity: 0.6,
    visible: false,
  });

  imgIDWHumidityLayer = new ol.layer.Image({
    title: 'IDW',
    id: 'HumidityIDW',
    //source: this.idw,
    opacity: 0.6,
    visible: false,
  });

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMap();
    //await this.fetchRiskData();
    // this.exportMapAsImage();
    this.filterCircleData();

    this.popupElement = document.getElementById('popup') as HTMLElement;
    this.popupContent = document.getElementById('popup-content') as HTMLElement;
    this.popupCloser = document.getElementById('popup-closer') as HTMLElement;

    this.popupOverlay = new Overlay({
      element: this.popupElement,
      autoPan: { animation: { duration: 250 } },
    });
    // this.map.addOverlay(this.popupOverlay);

    this.popupCloser.onclick = () => {
      this.popupOverlay.setPosition(undefined);
      this.popupCloser.blur();
      return false;
    };

    this.map.addOverlay(this.popupOverlay);

    // Handle close button click
    this.popupCloser?.addEventListener('click', () => {
      this.popupOverlay.setPosition(undefined);
    });
  }

  ngOnInit(): void {
    // this.loadTowerData()
    this.loadNewTowerData(
      'https://mlinfomap.org/geoserver/weather_postgres/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=weather_postgres%3Atower_locations&outputFormat=application%2Fjson&maxFeatures=10000'
    ),
      this.loadDistrictData();
    this.generateRegionWiseWeatherIDW();
  }
  loadDistrictData() {
    // const districtSource = new VectorSource({
    //   url: 'assets/data/District_HQ717.geojson',
    //   format: new GeoJSON(),
    // });
    //   const districtLayer = new VectorLayer({
    //   source: districtSource,
    //   visible: true,
    //   style: new Style({
    //     stroke: new Stroke({
    //       color: 'blue',
    //       width: 2,
    //     }),
    //     fill: new Fill({
    //       color: 'rgba(0, 0, 255, 0.1)',
    //     }),
    //   }),
    // });
    // Add it to the existing map
    // this.map.addLayer(districtLayer);
  }
  features: any = [];
  loadNewTowerData(geoJsonDataURL: string) {
    this.http.get(geoJsonDataURL).subscribe((geojson: any) => {
      const features = new GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857',
      });
      this.newtowerSource.addFeatures(features);
    });
  }

  convertToGeoJSON(apiData: any): GeoJSON.FeatureCollection {
    const features = apiData[0].map((record: any) => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [record.Longitude, record.Latitude],
        },
        properties: {
          ...record,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features: features,
    };
  }

  showHideZoneList() {
    this.showZoneListDropdown = !this.showZoneListDropdown;
    this.showCircleListDropdown = false;
  }

  showHideCircleList() {
    this.showCircleListDropdown = !this.showCircleListDropdown;
    this.showZoneListDropdown = false;
  }

  filterCircleData() {
    let filteredStates: string[] = [];

    if (this.selectedZoneArray.length > 0) {
      this.selectedZoneArray.forEach((zone: string) => {
        if (this.zoneWiseState[zone]) {
          const truncatedStates = this.zoneWiseState[zone].map((state) =>
            state.slice(0, 12)
          );
          filteredStates = filteredStates.concat(truncatedStates);
        }
      });
    } else {
      Object.values(this.zoneWiseState).forEach((states: string[]) => {
        const truncatedStates = states.map((state) => state.slice(0, 12));
        filteredStates = filteredStates.concat(truncatedStates);
      });
    }
    this.circleArray = ['All', ...filteredStates];
  }
onCircleLevelChange(event: Event): void {
  const level = (event.target as HTMLSelectElement).value;
  console.log('Selected circle level (dummy):', level);

  // Placeholder — actual circle logic comes later
  // e.g., toggle visibility, style, etc.
}
  onChangeCheckboxZone(event: any): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    const checked = inputElement.checked;
    const nonAllYears = this.zoneArray.filter((y: string) => y !== 'All');
    if (value === 'All') {
      if (checked) {
        this.selectedZoneArray = [...nonAllYears, 'All'];
      } else {
        this.selectedZoneArray = [];
      }
    } else {
      if (checked) {
        if (!this.selectedZoneArray.includes(value)) {
          this.selectedZoneArray.push(value);
        }
        const allSelected = nonAllYears.every((year: any) =>
          this.selectedZoneArray.includes(year)
        );
        if (allSelected && !this.selectedZoneArray.includes('All')) {
          this.selectedZoneArray.push('All');
        }
      } else {
        this.selectedZoneArray = this.selectedZoneArray.filter(
          (year: string) => year !== value
        );
        this.selectedZoneArray = this.selectedZoneArray.filter(
          (year: string) => year !== 'All'
        );
      }
    }
    this.filterCircleData();
  }

  onChangeCheckboxCircle(event: any): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    const checked = inputElement.checked;
    const nonAllYears = this.circleArray.filter((y: string) => y !== 'All');
    if (value === 'All') {
      if (checked) {
        this.selectedCircleArray = [...nonAllYears, 'All'];
      } else {
        this.selectedCircleArray = [];
      }
    } else {
      if (checked) {
        if (!this.selectedCircleArray.includes(value)) {
          this.selectedCircleArray.push(value);
        }
        const allSelected = nonAllYears.every((year: any) =>
          this.selectedCircleArray.includes(year)
        );
        if (allSelected && !this.selectedCircleArray.includes('All')) {
          this.selectedCircleArray.push('All');
        }
      } else {
        this.selectedCircleArray = this.selectedCircleArray.filter(
          (year: string) => year !== value
        );
        this.selectedCircleArray = this.selectedCircleArray.filter(
          (year: string) => year !== 'All'
        );
      }
    }
  }

  private async fetchWeatherData(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://mlinfomap.biz/WeatherAPI/api/WeatherData'
      );
      if (!response.ok)
        throw new Error(`Error fetching weather data: ${response.status}`);
      const result = await response.json();
      if (result.message === 'Result found' && result.data?.recordsets?.[0]) {
        return result.data.recordsets[0].map((item: any) => ({
          latitude: item.Latitude,
          longitude: item.Longitude,
          temperature: parseFloat(item.CurrentTemp.replace('°C', '').trim()),
          location: item.Location,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return [];
    }
  }

  private async fetchRiskData(): Promise<void> {
    try {
      const response = await fetch(
        'http://localhost:8083/api/WeatherDataPlaceName'
      );
      const result = await response.json();
      if (result.message === 'Result found') {
        const records = result.data.recordsets[0];
        records.forEach((item: any) => {
          const type = item.Data_Type;
          const cat = item.Category.replace(/\s/g, '');
          // this.riskData[type][cat] = { Name: item.Name_Count, State: item.State_Count };
        });
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
    }
  }
  async getWeatherFromLatLong(
    lat: number,
    lon: number
  ): Promise<{
    name: string;
    state: string;
    lat: string;
    lon: string;
    dewPoint: string;
    feelsLikeTemp: string;
    gust: string;
    heatIndex: string;
    humidity: string;
    precip: string;
    pressure: string;
    temp: string;
    uv: string;
    visibility: string;
    windDir: string;
    windSpeed: string;
    windChill: string;
    cloud: string;
    condition: string;
    conditionIcon: string;
    dataTimeStamp: string;
  } | null> {
    const apiKey = '76458ac302254ce6a1e44038253107';
    const apiUrl = 'https://api.weatherapi.com/v1/current.json?key=';
    const finalUrl = `${apiUrl}${apiKey}&q=${lat},${lon}`;
    try {
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      this.weatherApiData = data;
      const id = `${lat}_${lon}`;
      this.towerWeatherInfo[id] = {
        name: data.location.name,
        state: data.location.region,
        lat: String(data.location.lat),
        lon: String(data.location.lon),
        dewPoint: data.current.dewpoint_c?.toString() ?? '',
        feelsLikeTemp: data.current.feelslike_c?.toString() ?? '',
        gust: data.current.gust_kph?.toString() ?? '',
        heatIndex: data.current.heatindex_c?.toString() ?? '',
        humidity: data.current.humidity?.toString() ?? '',
        precip: data.current.precip_mm?.toString() ?? '',
        pressure: data.current.pressure_mb?.toString() ?? '',
        temp: data.current.temp_c?.toString() ?? '',
        uv: data.current.uv?.toString() ?? '',
        visibility: data.current.vis_km?.toString() ?? '',
        windDir: data.current.wind_dir ?? '',
        windSpeed: data.current.wind_kph?.toString() ?? '',
        windChill: data.current.windchill_c?.toString() ?? '',
        cloud: data.current.cloud?.toString() ?? '',
        condition: data.current.condition.text ?? '',
        // conditionIcon: data.current.condition.icon ?? '',
        dataTimeStamp: data.current.last_updated ?? '',
      };
      return {
        name: data.location.name,
        state: data.location.region,
        lat: String(data.location.lat),
        lon: String(data.location.lon),
        dewPoint: data.current.dewpoint_c?.toString() ?? '',
        feelsLikeTemp: data.current.feelslike_c?.toString() ?? '',
        gust: data.current.gust_kph?.toString() ?? '',
        heatIndex: data.current.heatindex_c?.toString() ?? '',
        humidity: data.current.humidity?.toString() ?? '',
        precip: data.current.precip_mm?.toString() ?? '',
        pressure: data.current.pressure_mb?.toString() ?? '',
        temp: data.current.temp_c?.toString() ?? '',
        uv: data.current.uv?.toString() ?? '',
        visibility: data.current.vis_km?.toString() ?? '',
        windDir: data.current.wind_dir ?? '',
        windSpeed: data.current.wind_kph?.toString() ?? '',
        windChill: data.current.windchill_c?.toString() ?? '',
        cloud: data.current.cloud?.toString() ?? '',
        condition: data.current.condition.text ?? '',
        conditionIcon: data.current.condition.icon ?? '',
        dataTimeStamp: data.current.last_updated ?? '',
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }

  // Assuming this.map is your OpenLayers map instance
  zoomToNewTowerLayerFeatures(layer: any): void {
    const varanasiCoordinates = fromLonLat([82.9739, 25.3176]); // [lon, lat]

    this.map.getView().setCenter(varanasiCoordinates);
    this.map.getView().setZoom(10);
  }
  //#region initialize map
  private async initializeMap(): Promise<void> {
    this.dataPoints = await this.fetchWeatherData();

    const upBoundary = [77.0, 23.8, 84.6, 30.4];
    const upExtent = transformExtent(upBoundary, 'EPSG:4326', 'EPSG:3857');
    const upBoundaryGeometry = new Polygon([
      [
        [77.0, 23.8],
        [84.6, 23.8],
        [84.6, 30.4],
        [77.0, 30.4],
        [77.0, 23.8],
      ].map(([lon, lat]) => fromLonLat([lon, lat])),
    ]);

    const features = this.dataPoints.map(
      (dataPoint) =>
        new Feature({
          geometry: new Point(
            fromLonLat([dataPoint.longitude, dataPoint.latitude])
          ),
          value: dataPoint.temperature,
          location: dataPoint.location,
        })
    );

    // Define base map layer
    const baseMap = new TileLayer({
      source: new ol.source.XYZ({
        url: 'http://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
      }),
    });
    const upLayer = new TileLayer({
      source: new TileWMS({
        url: 'http://mlinfomap.org/geoserver/weather/wms?',
        params: {
          LAYERS: 'weather:UP BND',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.8,
    });
    const newTowerLayer = new VectorLayer({
      source: this.newtowerSource,
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: this.towerIconUrl,
          scale: 0.5,
        }),
      }),
      visible: true,
      // minZoom: 1,
    });
    //#region Map tile
    this.map = new Map({
      target: 'map',
      layers: [
        baseMap,
        this.imgIDWTempLayer,
        this.imgIDWRainFallLayer,
        this.imgIDWWindLayer,
        this.imgIDWHumidityLayer,
        this.teleconServices,
        newTowerLayer,
      ],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat([25.446356542436767, 82.83201876568786]),
        zoom: 5.5,
      }),
      controls: olDefaultControls({ zoom: false }).extend([
        new FullScreen(),
        new Zoom(),
      ]),
    });

    // --- Popup element
    const container = document.getElementById('popup') as HTMLElement;
    const closer = document.getElementById('popup-closer') as HTMLElement;

    // --- Overlay for popup
    const overlay = new Overlay({
      element: this.popupElement,
      offset: [0, -15],
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    this.map.addOverlay(overlay);

    // --- Close popup handler
    closer.onclick = function () {
      overlay.setPosition(undefined);
      closer.blur();
      return false;
    };
    //#region Map OnClick
    this.map.on('click', async (evt) => {
      // const feature = this.map.forEachFeatureAtPixel(evt.pixel, f => f);
      var pixel = this.map.getEventPixel(evt.originalEvent);
      const feature = this.map.forEachFeatureAtPixel(pixel, async (feature) => {
        if (feature) {
          let id = feature.getId();

          if (id !== undefined && id !== null) {
            if (!this.popupOverlay) {
              return;
            }
            const targetFeature = this.newtowerSource.getFeatureById(id);
            let towerLat = targetFeature?.get('PRIORITY_LATITUDE');
            let towerLon = targetFeature?.get('PRIORITY_LONGITUDE');
            let siteName = (
              targetFeature?.get('SITE_NAME') || ''
            ).toUpperCase();
            let district = targetFeature?.get('DISTRICTNAME');
            let siteCategory = targetFeature?.get('SITECATEGORY');
            let dgStatus = targetFeature?.get('DG_STATUS');
            let circle = targetFeature?.get('CIRCLE');
            let strategic = targetFeature?.get('STRATEGIC');
            if (towerLat && towerLon) {
              this.WeatherService.setLocation(towerLat, towerLon);
            }
            const coord = evt.coordinate;
            const resultData = await this.getWeatherFromLatLong(
              towerLat,
              towerLon
            );
            if (!resultData) return;

            const weatherIconUrl = resultData?.conditionIcon
              ? `https:${resultData.conditionIcon}`
              : '';

            const html = `
  <div style="font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6;">
    
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 10px;">
      <div>
        <i class="fas fa-broadcast-tower" style="color: #007bff;"></i>
        <strong>SITE:</strong> ${siteName}
      </div>
      <div>
        <i class="fas fa-circle" style="color: #28a745;"></i>
        <strong>Circle:</strong> ${circle}
      </div>
      <div>
        <i class="fas fa-map-marker-alt" style="color: #dc3545;"></i>
        <strong>District:</strong> ${district}
      </div>
    </div>

    <div style="margin-bottom: 10px;">
      <div>
        <i class="fas fa-building" style="color: #6c757d;"></i>
        <strong>Category:</strong> ${siteCategory}
      </div>
      <div>
        <i class="fas fa-bolt" style="color: #ffc107;"></i>
        <strong>DG Status:</strong> ${dgStatus}
      </div>
      <div>
        <i class="fas fa-compass" style="color: #17a2b8;"></i>
        <strong>Strategic:</strong> ${strategic}
      </div>
    </div>

    <div style="margin-top: 10px;">
      <img src="${weatherIconUrl}" alt="Weather Icon"
           style="vertical-align: middle; width: 48px; height: 48px;" />
      <span style="font-size: 1.2em; font-weight: bold;">${resultData.temp}°C</span><br>
      <span>${resultData.condition}</span>
    </div>
    
  </div>
`;
            // const coord = evt.coordinate;
            this.popupContent.innerHTML = html;
            this.popupOverlay.setPosition(coord);
          }
        } else {
          container.style.display = 'none';
          this.popupOverlay.setPosition(undefined);
        }
      });
    });

    this.setupPointerCursor(this.map, upBoundaryGeometry);
    this.setupMapClick(this.map, upBoundaryGeometry, features);

    this.zoomToNewTowerLayerFeatures(newTowerLayer);
  }

  private setupPointerCursor(map: Map, boundary: Polygon): void {
    map.on('pointermove', (event) => {
      const hoveredCoordinate = event.coordinate;
      map.getTargetElement().style.cursor = boundary.intersectsCoordinate(
        hoveredCoordinate
      )
        ? 'pointer'
        : 'default';
    });
  }

  private setupMapClick(
    map: Map,
    boundary: Polygon,
    features: Feature[]
  ): void {
    let popupOverlay: Overlay | null = null;
  }

  //#region IDW Layer

  zoomToIndiaExtent = () => {
    this.map.getView().fit(this.indiaExtent, {
      padding: [20, 20, 20, 20],
      duration: 1000,
    });
  };

  toggleTempIDW = () => {
    this.minRange = `${this.minTemp} (°C)`;
    this.maxRange = `${this.maxTemp} (°C)`;
    this.isIDWLayer = true;
    this.imgIDWTempLayer.setVisible(true);
    this.imgIDWWindLayer.setVisible(false);
    this.imgIDWHumidityLayer.setVisible(false);
    this.imgIDWRainFallLayer.setVisible(false);
    this.zoomToIndiaExtent();
  };
  toggleRainIDW = () => {
    this.minRange = `${this.minRain} (%)`;
    this.maxRange = `${this.maxRain} (%)`;
    this.isIDWLayer = true;
    this.imgIDWRainFallLayer.setVisible(true);
    this.imgIDWTempLayer.setVisible(false);
    this.imgIDWWindLayer.setVisible(false);
    this.imgIDWHumidityLayer.setVisible(false);
    this.zoomToIndiaExtent();
  };
  toggleWindIDW = () => {
    this.minRange = `${this.minWind} (kph)`;
    this.maxRange = `${this.maxWind} (kph)`;
    this.isIDWLayer = true;
    this.imgIDWWindLayer.setVisible(true);
    this.imgIDWTempLayer.setVisible(false);
    this.imgIDWRainFallLayer.setVisible(false);
    this.imgIDWHumidityLayer.setVisible(false);
    this.zoomToIndiaExtent();
  };
  toggleHumidiyIDW = () => {
    this.minRange = `${this.minHumidity} (%)`;
    this.maxRange = `${this.maxHumidity} (%)`;
    this.isIDWLayer = true;
    this.imgIDWHumidityLayer.setVisible(true);
    this.imgIDWTempLayer.setVisible(false);
    this.imgIDWRainFallLayer.setVisible(false);
    this.imgIDWWindLayer.setVisible(false);
    this.zoomToIndiaExtent();
  };

  generateRegionWiseWeatherIDW = async () => {
    this.dataService
      .postRequest('get-current-weather', {})
      .subscribe(async (res: any) => {
        const data = await res.data;
        if (!res.status) {
          throw new Error('Network response was not ok');
        }
        let vectorSourceTemp = new ol.source.Vector({});
        let vectorSourceRain = new ol.source.Vector({});
        let vectorSourceWind = new ol.source.Vector({});
        let vectorSourceHumidity = new ol.source.Vector({});

        // let data = geojsonData.features;
        this.minTemp = Math.min.apply(
          null,
          data.map((item: any) => parseFloat(item.temp_c))
        );
        this.minRain = Math.min.apply(
          null,
          data.map((item: any) => parseFloat(item.chance_of_rain))
        );
        this.minWind = Math.min.apply(
          null,
          data.map((item: any) => parseFloat(item.wind_kph))
        );
        this.minHumidity = Math.min.apply(
          null,
          data.map((item: any) => parseFloat(item.humidity))
        );

        this.maxTemp = Math.max.apply(
          null,
          data.map((item: any) => parseFloat(item.temp_c))
        );
        this.maxRain = Math.max.apply(
          null,
          data.map((item: any) => parseFloat(item.chance_of_rain))
        );
        this.maxWind = Math.max.apply(
          null,
          data.map((item: any) => parseFloat(item.wind_kph))
        );
        this.maxHumidity = Math.max.apply(
          null,
          data.map((item: any) => parseFloat(item.humidity))
        );

        data.forEach((item: any, index: any) => {
          // TEMP
          const coord3857 = transform(
            [item.longitude, item.latitude],
            'EPSG:4326',
            'EPSG:3857'
          );
          const featuresTemp = new ol.Feature({
            geometry: new ol.geom.Point(coord3857),
            total: item.temp_c,
            count: Math.ceil((item.temp_c / this.maxTemp) * 100),
          });
          // RAIN
          const featuresRain = new ol.Feature({
            geometry: new ol.geom.Point(coord3857),
            total: item.chance_of_rain,
            count: Math.ceil((item.chance_of_rain / this.maxRain) * 100),
          });
          // WIND
          const featureWind = new ol.Feature({
            geometry: new ol.geom.Point(coord3857),
            total: item.wind_kph,
            count: Math.ceil((item.wind_kph / this.maxWind) * 100),
          });
          // HUMIDITY
          const featureHumidity = new ol.Feature({
            geometry: new ol.geom.Point(coord3857),
            total: item.humidity,
            count: Math.ceil((item.humidity / this.maxHumidity) * 100),
          });
          vectorSourceTemp.addFeature(featuresTemp);
          vectorSourceRain.addFeature(featuresRain);
          vectorSourceWind.addFeature(featureWind);
          vectorSourceHumidity.addFeature(featureHumidity);
        });

        let idwTemp = new ol.source.IDW({
          source: vectorSourceTemp,
          weight: 'count',
        });
        let idwRain = new ol.source.IDW({
          source: vectorSourceRain,
          weight: 'count',
        });
        let idwWind = new ol.source.IDW({
          source: vectorSourceWind,
          weight: 'count',
        });
        let idwHumidity = new ol.source.IDW({
          source: vectorSourceHumidity,
          weight: 'count',
        });
        this.imgIDWTempLayer.setSource(idwTemp);
        this.imgIDWRainFallLayer.setSource(idwRain);
        this.imgIDWWindLayer.setSource(idwWind);
        this.imgIDWHumidityLayer.setSource(idwHumidity);

        this.cropHeatMapByBoundary();
      });
  };

  cropHeatMapByBoundary = async () => {
    const response = await fetch('assets/geojson/India_BND_Simplified.geojson');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const geojsonData = await response.json();

    const format = new ol.format.GeoJSON();
    const features = format.readFeatures(geojsonData, {
      featureProjection: 'EPSG:3857', // Adjust if your map uses a different projection
    });

    // Optional: collect all polygon geometries into one multipolygon
    const polygons = features.map((f: any) => f.getGeometry());

    // Merge all polygons into a single MultiPolygon
    const multiPolygon = new ol.geom.MultiPolygon(
      polygons
        .map((poly: any) => {
          if (poly instanceof ol.geom.Polygon) {
            return [poly.getCoordinates()];
          } else if (poly instanceof ol.geom.MultiPolygon) {
            return poly.getCoordinates();
          }
          return [];
        })
        .flat()
    );

    const cropFeature = new ol.Feature(multiPolygon);

    const crop = new ol.filter.Crop({
      feature: cropFeature,
      wrapX: true,
      inner: false,
    });
    this.indiaExtent = multiPolygon.getExtent();

    this.imgIDWTempLayer.addFilter(crop);
    this.imgIDWRainFallLayer.addFilter(crop);
    this.imgIDWWindLayer.addFilter(crop);
    this.imgIDWHumidityLayer.addFilter(crop);
  };

  onClearButtonClick = () => {
    this.WeatherService.clearSelectedLayer();
    this.isIDWLayer = false;
    this.imgIDWWindLayer.setVisible(false);
    this.imgIDWTempLayer.setVisible(false);
    this.imgIDWRainFallLayer.setVisible(false);
    this.imgIDWHumidityLayer.setVisible(false);
    this.map.getView().animate({
      center: this.initialCenter,
      zoom: this.initialZoom,
      duration: 500,
    });
  };
  //#endregion
}
