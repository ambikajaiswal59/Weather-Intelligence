import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat, transformExtent } from 'ol/proj';
import Feature from 'ol/Feature';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorSource from 'ol/source/Vector';
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
  selector: 'weather-map',
  templateUrl: './weather-map.html',
  imports: [FormsModule, CommonModule],
  standalone: true,
  styleUrls: ['./weather-map.css'],
})
export class WeatherMap implements AfterViewInit {
  map!: Map;
  public riskData: any = {
    Rain: { VeryHeavy: { Name: 0, State: 0 }, Heavy: { Name: 0, State: 0 }, Moderate: { Name: 0, State: 0 } },
    Temperature: { VeryHeavy: { Name: 0, State: 0 }, Heavy: { Name: 0, State: 0 }, Moderate: { Name: 0, State: 0 } },
    Wind: { VeryHeavy: { Name: 0, State: 0 }, Heavy: { Name: 0, State: 0 }, Moderate: { Name: 0, State: 0 } },
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private mapExport: MapExportService,
    private dataService: DataService
  ) { }

  towerSource = new VectorSource();
  teleconServicesSource = new VectorSource();
  showZoneListDropdown: boolean = false;
  zoneArray: any[] = ["All", "East", "West", "North", "South"]
  selectedZoneArray: any[] = []
  showCircleListDropdown: boolean = false;
  zoneWiseState: { [zone: string]: string[] } = {
    East: [
      "Kolkata",
      "Bhubaneswar",
      "Patna",
      "Guwahati"
    ],
    West: [
      "Mumbai",
      "Ahmedabad",
      "Pune",
      "Jaipur"
    ],
    North: [
      "Delhi",
      "Chandigarh",
      "Lucknow",
      "Dehradun"
    ],
    South: [
      "Chennai",
      "Bangalore",
      "Hyderabad",
      "Thiruvananthapuram"
    ]
  };
  circleArray: any[] = [];
  selectedCircleArray: any[] = []

  loading = false; // Loader flag
  private mapImage: string | null = null;

  towerIconUrl = '/assets/icons/tower_gray.svg'; // or your own SVG

  private dataPoints: any[] = [];

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMap();
    await this.fetchRiskData();
    // this.exportMapAsImage();
    this.filterCircleData()
  }

  ngOnInit(): void {
    this.loadTowerData()
  }

  loadTowerData (){
    debugger
    this.dataService.getTowerData('varanasiBTSData').subscribe((apiData:any) => {
      const geoJsonData = this.convertToGeoJSON(apiData.data.recordsets);
       const features = new GeoJSON().readFeatures(geoJsonData, {
        featureProjection: 'EPSG:3857',
      });
      this.towerSource.addFeatures(features)
    })
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
          ...record
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }



  exportPDF(): void {
    debugger
    const content = document.getElementById('pdf-content');
    if (!content) return;

    this.loading = true;

    const mapEl = document.getElementById('map');
    const olCanvas = mapEl?.querySelector('.ol-layer canvas') as HTMLCanvasElement;
    let injectedMapImg: HTMLImageElement | null = null;

    // if (olCanvas) olCanvas.style.display = 'none';

    const proceedToExport = () => {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';

      html2canvas(content, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scale: 1,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png', 0.9);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('weather-bulletin.pdf');

        if (injectedMapImg) injectedMapImg.remove();
        if (olCanvas) olCanvas.style.display = '';
        if (loader) loader.style.display = 'flex';
        this.loading = false;
      }).catch((err) => {
        console.error('Error generating PDF:', err);
        if (olCanvas) olCanvas.style.display = '';
        if (loader) loader.style.display = 'flex';
        this.loading = false;
      });
    };

    // Inject map image and wait for load
    // this.exportMapPng()
    if (this.mapImage && mapEl) {
      const img = new Image();
      img.src = this.mapImage;
      img.onload = () => {
        img.style.position = 'absolute';  // or 'static'

        img.style.objectFit = 'cover';
        img.style.zIndex = '1';
        img.style.display = 'block';
        // img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        // img.style.width = '100%';
        img.style.border = 'none';
        img.style.boxShadow = 'none';
        // img.style.zIndex = '0';
        img.classList.add('export-map-image');



        mapEl.appendChild(img);
        injectedMapImg = img;
        proceedToExport();
      };
      img.onerror = () => {
        console.error('Failed to load map image.');
        if (olCanvas) olCanvas.style.display = '';
        this.loading = false;
      };
    } else {
      proceedToExport();
    }
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
          const truncatedStates = this.zoneWiseState[zone].map(state => state.slice(0, 12));
          filteredStates = filteredStates.concat(truncatedStates);
        }
      });
    } else {
      Object.values(this.zoneWiseState).forEach((states: string[]) => {
        const truncatedStates = states.map(state => state.slice(0, 12));
        filteredStates = filteredStates.concat(truncatedStates);
      });
    }

    console.log(filteredStates);
    this.circleArray = ["All", ...filteredStates];
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
    this.filterCircleData()
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
      const response = await fetch('https://mlinfomap.biz/WeatherAPI/api/WeatherData');
      if (!response.ok) throw new Error(`Error fetching weather data: ${response.status}`);
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
      const response = await fetch('http://localhost:8083/api/WeatherDataPlaceName');
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

  private async initializeMap(): Promise<void> {
    this.dataPoints = await this.fetchWeatherData();


    const upBoundary = [77.0, 23.8, 84.6, 30.4];
    const upExtent = transformExtent(upBoundary, 'EPSG:4326', 'EPSG:3857');
    const upBoundaryGeometry = new Polygon([[
      [77.0, 23.8],
      [84.6, 23.8],
      [84.6, 30.4],
      [77.0, 30.4],
      [77.0, 23.8],
    ].map(([lon, lat]) => fromLonLat([lon, lat]))]);

    const features = this.dataPoints.map((dataPoint) =>
      new Feature({
        geometry: new Point(fromLonLat([dataPoint.longitude, dataPoint.latitude])),
        value: dataPoint.temperature,
        location: dataPoint.location,
      })
    );

    const vectorSource = new VectorSource({ features });
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




    // const towerSource = new VectorSource({
    //   format: new GeoJSON(),
    //   url: 'https://mlinfomap.org/geoserver/Telecom/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Telecom%3ATOWER_IN_VARANASI&outputFormat=application%2Fjson&maxFeatures=10000',
    // });


    const towerLayer = new VectorLayer({
      source: this.towerSource,
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: this.towerIconUrl,
          scale: 0.7,
        }),
      }),
    });
    const teleconServices = new VectorLayer({
      source: this.teleconServicesSource,
      style: new Style({
        stroke: new Stroke({
          color: '#0078D4',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 120, 212, 0.1)'
        })
      })
    });

    this.map = new Map({
      target: 'map',
      layers: [baseMap, teleconServices, upLayer, towerLayer,],
      view: new View({
        center: fromLonLat([80.9, 26.85]),
        zoom: 5.5,
      }),
    });



    // --- Popup element
    const container = document.getElementById('popup') as HTMLElement;
    const closer = document.getElementById('popup-closer') as HTMLElement;

    // --- Overlay for popup
    const overlay = new Overlay({
      element: container,
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


    this.map.on('click', (evt) => {
      debugger
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, f => f);
      let id = feature?.get('ID') || '';
      if (feature && id) {
        const id = feature.get('ID') || '';
        let location = feature.get('Location') || '';
        location = location.split(',')[0]
        const tempHighToday = feature.get('TempHighToday') || '';
        const tempLowToday = feature.get('TempLowToday') || '';
        const tempHighTomorrow = feature.get('TempHighTomorrow') || '';
        const tempLowTomorrow = feature.get('TempLowTomorrow') || '';
        const SkyToday = feature.get('SkyToday') || '';
        const SkyTomorrow = feature.get('SkyTomorrow') || '';
        const windSpeedToday = feature.get('WindSpeedToday') || '';
        const windSpeedTomorrow = feature.get('WindSpeedTomorrow') || '';
        // this.riskData.Rain.VeryHeavy.Name = tempHighToday.split(' ').join('')
        // this.riskData.Rain.Moderate.Name = tempLowToday.split(' ').join('')
        // this.riskData.Temperature.VeryHeavy.Name = tempHighToday.split(' ').join('')
        // this.riskData.Temperature.Moderate.Name = tempLowToday.split(' ').join('')
        // this.riskData.Wind.VeryHeavy.Name = tempHighToday.split(' ').join('')
        // this.riskData.Wind.Moderate.Name = tempLowToday.split(' ').join('')
        // this.cdr.detectChanges();
        if (!id || !location) return;
        const coordinate = evt.coordinate;
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
          tableBody.innerHTML = `
                                <tr><td>ID</td><td>${id}</td></tr>
                                <tr><td>Location</td><td>${location}</td></tr>
                                <tr><td>TempLowToday</td><td>${tempLowToday}</td></tr>
                                <tr><td>TempHighToday</td><td>${tempHighToday}</td></tr>
                                <tr><td>TempLowTomorrow</td><td>${tempLowTomorrow}</td></tr>
                                <tr><td>TempHighTomorrow</td><td>${tempHighTomorrow}</td></tr>
                                <tr><td>SkyToday</td><td>${SkyToday}</td></tr>
                                <tr><td>SkyTomorrow</td><td>${SkyTomorrow}</td></tr>
                                <tr><td>WindSpeedToday</td><td>${windSpeedToday}</td></tr>
                                <tr><td>WindSpeedTomorrow</td><td>${windSpeedTomorrow}</td></tr>
                                `;
        }
        overlay.setPosition(coordinate);
        container.style.display = "block"
      } else {
        container.style.display = "none"
        overlay.setPosition(undefined);
        //  this.riskData.Temperature.VeryHeavy.Name = 0;
        // this.riskData.Temperature.Moderate.Name = 0;
        // this.cdr.detectChanges();
      }
    });


    this.addClusterLayer(this.map, vectorSource);
    this.setupPointerCursor(this.map, upBoundaryGeometry);
    this.setupMapClick(this.map, upBoundaryGeometry, features)

    this.dataService.getFilteredFeatures().subscribe((filteredGeoJSON) => {
      const features = new GeoJSON().readFeatures(filteredGeoJSON, {
        featureProjection: 'EPSG:3857',
      });

      this.teleconServicesSource.addFeatures(features);
    });

  }

  private addClusterLayer(map: Map, source: VectorSource): void {
    const clusterSource = new Cluster({ distance: 40, source });

    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const clusterFeatures = feature.get('features');
        const avgTemp = clusterFeatures.reduce(
          (sum: number, f: Feature<Point>) => sum + (f.get('value') || 0), 0
        ) / clusterFeatures.length;

        return new Style({
          image: new Circle({
            radius: 20,
            fill: new Fill({ color: 'rgba(255, 200, 0, 0.6)' }),
            stroke: new Stroke({ color: '#ffa500', width: 2 }),
          }),
          text: new Text({
            text: `${avgTemp.toFixed(1)} °C`,
            font: '12px bold Arial',
            fill: new Fill({ color: '#000' }),
          }),
        });
      },
    });

    map.addLayer(clusterLayer);
  }

  private setupPointerCursor(map: Map, boundary: Polygon): void {
    map.on('pointermove', (event) => {
      const hoveredCoordinate = event.coordinate;
      map.getTargetElement().style.cursor = boundary.intersectsCoordinate(hoveredCoordinate) ? 'pointer' : 'default';
    });
  }

  private setupMapClick(map: Map, boundary: Polygon, features: Feature[]): void {
    let popupOverlay: Overlay | null = null;

    // map.on('click', (event) => {

    //   const clickedCoordinate = event.coordinate;
    //   if (!boundary.intersectsCoordinate(clickedCoordinate)) return;

    //   const clickedPoint = turfPoint(fromLonLat(clickedCoordinate));
    //   let weightSum = 0, valueSum = 0;

    //   features.forEach((feature) => {
    //     const geometry = feature.getGeometry();
    //     if (geometry instanceof Point) {
    //       const coords = geometry.getCoordinates();
    //       const distance = turfDistance(turfPoint(fromLonLat(coords)), clickedPoint, { units: 'kilometers' });
    //       const weight = 1 / Math.pow(distance || 0.0001, 2);
    //       const value = feature.get('value');
    //       weightSum += weight;
    //       valueSum += weight * value;
    //     }
    //   });

    //   const interpolatedValue = valueSum / weightSum;

    //   if (popupOverlay) map.removeOverlay(popupOverlay);

    //   const popupContent = document.createElement('div');
    //   popupContent.style.cssText = 'background:white;padding:10px;border-radius:4px;border:1px solid #ccc;';
    //   popupContent.textContent = `Interpolated Temperature: ${interpolatedValue.toFixed(2)} °C`;

    //   popupOverlay = new Overlay({
    //     element: popupContent,
    //     position: clickedCoordinate,
    //     positioning: 'bottom-center',
    //   });

    //   map.addOverlay(popupOverlay);
    // });
  }

  // private exportMapAsImage(): void {
  //   this.map.once('rendercomplete', () => {
  //     const mapCanvas = document.createElement('canvas');
  //     const size = this.map.getSize();
  //     if (!size) return;

  //     mapCanvas.width = size[0];
  //     mapCanvas.height = size[1];
  //     const context = mapCanvas.getContext('2d');
  //     if (!context) return;

  //     Array.from(document.querySelectorAll('.ol-layer canvas')).forEach((canvas: any) => {
  //       if (canvas.width > 0 && canvas.height > 0) {
  //         context.drawImage(canvas, 0, 0);
  //       }
  //     });

  //     try {
  //       const imageData = mapCanvas.toDataURL('image/png');
  //       this.mapExport.setMapImage(imageData);
  //     } catch (e) {
  //       console.error('Tainted canvas: map export failed.', e);
  //       this.mapExport.setMapImage(null);
  //     }
  //   });

  //   this.map.renderSync();
  // }

}
