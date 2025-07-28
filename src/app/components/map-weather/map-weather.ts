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

@Component({
  selector: 'app-map-weather',
  imports: [],
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
    private dataService: DataService
  ) {}
  weatherApiData: any = {};
  newTowerLayer!: VectorLayer<any>;
  newtowerSource = new VectorSource();

  teleconServicesSource = new VectorSource();
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
  circleArray: any[] = [];
  selectedCircleArray: any[] = [];

  loading = false; // Loader flag
  private mapImage: string | null = null;

  towerIconUrl = '/assets/icons/tower_2.svg'; // or your own SVG

  private dataPoints: any[] = [];

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMap();
    await this.fetchRiskData();
    // this.exportMapAsImage();
    this.filterCircleData();

    this.popupElement = document.getElementById('popup') as HTMLElement;
    this.popupContent = document.getElementById('popup-content') as HTMLElement;
    this.popupCloser = document.getElementById('popup-closer') as HTMLElement;

    this.popupOverlay = new Overlay({
      element: this.popupElement,
      // offset: [0, 0], // Move popup slightly upwards
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    // this.map.addOverlay(this.popupOverlay);

    this.popupCloser.onclick = () => {
      this.popupOverlay.setPosition(undefined);
      this.popupCloser.blur();
      return false;
    };

    this.map.addOverlay(this.popupOverlay);

    // Handle close button click
    this.popupCloser.onclick = () => {
      this.popupOverlay.setPosition(undefined);
      this.popupCloser.blur();
      return false;
    };
  }

  ngOnInit(): void {
    // this.loadTowerData()
    this.loadNewTowerData(
      'https://mlinfomap.org/geoserver/weather_postgres/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=weather_postgres%3Atower_locations&outputFormat=application%2Fjson&maxFeatures=10000'
    ),
      this.loadDistrictData();
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

    console.log(filteredStates);
    this.circleArray = ['All', ...filteredStates];
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
    dataTimeStamp: string;
  } | null> {
    const apiKey = '6e28b1d11b314f5db2b43257251707';
    const apiUrl = 'http://api.weatherapi.com/v1/current.json?key=';
    const finalUrl = `${apiUrl}${apiKey}&q=${lat},${lon}`;
    console.log(`finalUrl:${finalUrl}`);
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
        dataTimeStamp: data.current.last_updated ?? '',
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }

  // Assuming this.map is your OpenLayers map instance
  zoomToNewTowerLayerFeatures(layer: any): void {
   
    const towerLayerExtent = layer.getSource().getExtent();
    this.map.getView().fit(towerLayerExtent, {
      size: this.map.getSize(),
    });
  //   if (towerLayerExtent && !isNaN(towerLayerExtent[0])) {
  //   // First, center the map on the extent
  //   const center = [
  //     (towerLayerExtent[0] + towerLayerExtent[2]) / 2,
  //     (towerLayerExtent[1] + towerLayerExtent[3]) / 2
  //   ];

  //   this.map.getView().animate({
  //     center: center,
  //     zoom: 12,          // ✅ Fixed zoom level
  //     duration: 1000
  //   });
  // } else {
  //   console.warn('Layer has no features or valid extent');
  // }
  }

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
      source: new OSM(),
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

    const teleconServices = new VectorLayer({
      source: this.teleconServicesSource,
      style: new Style({
        stroke: new Stroke({
          color: '#0078D4',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(0, 120, 212, 0.1)',
        }),
      }),
    });
    this.map = new Map({
      target: 'map',
      layers: [baseMap, teleconServices, newTowerLayer],
      
      // layers: [baseMap, newTowerLayer, ],
      view: new View({
        projection: 'EPSG:3857', // ✅ Use geographic coordinates (lon/lat)
        center: fromLonLat([80.9, 26.85]),
        zoom: 5.5,
      }),
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

    this.map.on('click', async (evt) => {
      debugger;
      // const feature = this.map.forEachFeatureAtPixel(evt.pixel, f => f);
      var pixel = this.map.getEventPixel(evt.originalEvent);
      const feature = this.map.forEachFeatureAtPixel(pixel, async (feature) => {
        if (feature) {
          let id = feature.getId();
          console.log(`id feature: ${id}`);

          if (id !== undefined && id !== null) {
            if (!this.popupOverlay) {
              // console.error('Popup overlay is not initialized yet.');
              return;
            }
            const targetFeature = this.newtowerSource.getFeatureById(id);
            // console.log('Target feature:', targetFeature);
            let towerLat = targetFeature?.get('PRIORITY_LATITUDE');
            let towerLon = targetFeature?.get('PRIORITY_LONGITUDE');

            const coord = evt.coordinate;
            const resultData = await this.getWeatherFromLatLong(
              towerLat,
              towerLon
            );
            const wind_Direction = resultData?.windDir;

            // If valid direction, calculate angle
            const html = ` <strong>${resultData?.name}</strong><br>
              <img src='assets/icons/popup_temp.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px;"/> ${resultData?.temp}°C<br>
              <img src='assets/icons/popup_rainfall.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px; filter: invert(18%) sepia(93%) saturate(2740%) hue-rotate(200deg) brightness(90%) contrast(94%);"/> ${resultData?.condition}<br>
              <img src='assets/icons/popup_winds.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px;"/> ${resultData?.windSpeed} km/h <img id="windIcon" src='assets/icons/popup_windDir.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px;"/>${resultData?.windDir}<br>
              <img src='assets/icons/popup_clouds.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px;"/>  ${resultData?.cloud}%<br>
              <img src='assets/icons/popup_humidity.svg' alt='temp_icon' width="20" style="vertical-align: middle; margin-right: 6px;"/> ${resultData?.humidity}%`;
            this.popupContent.innerHTML = html;
            this.popupOverlay.setPosition(coord);
            if (typeof wind_Direction === 'string') {
              const directions = [
                'N',
                'NNE',
                'NE',
                'ENE',
                'E',
                'ESE',
                'SE',
                'SSE',
                'S',
                'SSW',
                'SW',
                'WSW',
                'W',
                'WNW',
                'NW',
                'NNW',
              ];
              const anglePerDirection = 360 / directions.length;
              const dirIndex = directions.indexOf(wind_Direction);
              const angle = dirIndex !== -1 ? dirIndex * anglePerDirection : 0;

              const icon = document.getElementById('windIcon');
              if (icon) {
                icon.style.transform = `rotate(${angle}deg)`;
                icon.style.transformOrigin = '50% 50%';
              }
            }
          }
        } else {
          container.style.display = 'none';
        }
      });
    });

    // this.addClusterLayer(this.map, vectorSource);
    this.setupPointerCursor(this.map, upBoundaryGeometry);
    this.setupMapClick(this.map, upBoundaryGeometry, features);

    this.dataService.getFilteredFeatures().subscribe((filteredGeoJSON) => {
      const features = new GeoJSON().readFeatures(filteredGeoJSON, {
        featureProjection: 'EPSG:3857',
      });

      this.teleconServicesSource.addFeatures(features);
    });
    debugger;
    this.zoomToNewTowerLayerFeatures(newTowerLayer);
  }

  // private addClusterLayer(map: Map, source: VectorSource): void {
  //   const clusterSource = new Cluster({ distance: 40, source });

  //   const clusterLayer = new VectorLayer({
  //     source: clusterSource,
  //     style: (feature) => {
  //       const clusterFeatures = feature.get('features');
  //       const avgTemp =
  //         clusterFeatures.reduce(
  //           (sum: number, f: Feature<Point>) => sum + (f.get('value') || 0),
  //           0
  //         ) / clusterFeatures.length;

  //       return new Style({
  //         image: new Circle({
  //           radius: 20,
  //           fill: new Fill({ color: 'rgba(255, 200, 0, 0.6)' }),
  //           stroke: new Stroke({ color: '#ffa500', width: 2 }),
  //         }),
  //         text: new Text({
  //           text: `${avgTemp.toFixed(1)} °C`,
  //           font: '12px bold Arial',
  //           fill: new Fill({ color: '#000' }),
  //         }),
  //       });
  //     },
  //   });

  //   map.addLayer(clusterLayer);
  // }

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
}
