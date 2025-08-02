import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { MapWeather } from '../../components/map-weather/map-weather';
import { DataService } from '../../data-service/data-service';
import { WeatherService } from '../../services/weather';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
  ChartOptions,
  ChartData,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip
);
interface DailyWeather {
  date: string;
  minTemp: number;
  maxTemp: number;
  description: string;
  chanceOfRain: any;
  humidity: any;
  icon: string;
}
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, NgIf, BaseChartDirective, MapWeather],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css'],
})
export class Reports {
  public isBrowser = typeof window !== 'undefined';
  selectedPage = 'dashboard';
  showForecast = false;
  atScrollStart: boolean = true;
  atScrollEnd: boolean = false;
  current: any = null;
  location: any = null;
  activeAccordion: string = '';
  currentTime: string = '';
  lastUpdatedTime: string = '';
  loading: boolean = false;
  isOpen = false;
  selectedHazard = '';
  selectedDistrict = '';
  selectedTab = 1;



  activeTab: string = 'rainfall';
  setActive(tab: string) {
    this.activeTab = tab;
  }
  
  

  selectTab(tabNumber: number) {
    this.selectedTab = tabNumber;
  }
  weatherData: DailyWeather[] = [];
  ngAfterViewInit(): void {
    this.WeatherService.location$.subscribe((location: string) => {
      this.fetchWeatherData(location);
    });
  }
  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private WeatherService: WeatherService
  ) {}
  weatherKPIs: {
    label: string;
    icon: string;
    max: number;
    min: number;
  }[] = [];
  // #region Fetch Weather data
  fetchWeatherData = (location: string = 'Varanasi,India') => {
    debugger;
    this.loading = true;
    this.dataService.getWeatherForecast(location).subscribe({
      next: (data: any) => {
        this.location = data.location;
        this.current = data.current;
        this.weatherKPIs = [
          {
            label: 'Temperature',
            icon: 'assets/icons/temp.svg',
            max: this.current.temp_c,
            min: this.weatherData[0]?.minTemp ?? 0,
          },
          {
            label: 'Humidity',
            icon: 'assets/icons/Humidity.svg',
            max: this.current.humidity,
            min: 0, // or fetch from historical/forecast data if needed
          },
          {
            label: 'Rainfall',
            icon: 'assets/icons/rainfall.svg',
            max: this.current.precip_mm,
            min: 0,
          },
          {
            label: 'Wind',
            icon: 'assets/icons/wind.svg',
            max: this.current.wind_kph,
            min: 0,
          },
        ];
        this.currentTime = new Date(data.location.localtime).toLocaleString(
          'en-IN',
          {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        );

        this.lastUpdatedTime = new Date(
          data.current.last_updated
        ).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        this.weatherData = data.forecast.forecastday.map((day: any) => ({
          date: new Date(day.date).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          }),
          humidity: day.day.avghumidity,
          minTemp: day.day.mintemp_c,
          maxTemp: day.day.maxtemp_c,
          description: day.day.condition.text,
          chanceOfRain: day.day.daily_chance_of_rain,
          icon: day.day.condition.icon,
        }));
        //this.hourlyData = data.forecast.forecastday[0].hour.map(/**/);
        //this.weatherData = data.forecast.forecastday.map(/**/);
       // this.activeAccordion = 'hourly';
       // this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Weather API error:', err);
        this.loading = false;
      },
    });
  };
  severityTable = [
    {
      label: 'Extreme',
      rainfall: '>25%',
      temp: '>165',
      wind: '>75%',
      fog: '>70%',
    },
    {
      label: 'High',
      rainfall: '10%-25%',
      temp: '117-165',
      wind: '60%-75%',
      fog: '55%-70%',
    },
    {
      label: 'Moderate',
      rainfall: '5%-10%',
      temp: '87-117',
      wind: '40%-60%',
      fog: '35%-50%',
    },
  ];

  public barChartType: 'bar' = 'bar';
  public barChartLegend = true;

  public barChartOptions1: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Weather Data (Chart 1)',
      },
    },
  };

  public barChartOptions2: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Weather Data (Chart 2)',
      },
    },
  };

  public barChartData1: ChartData<'bar'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'High',
        data: [45, 67, 80, 56, 70],
        backgroundColor: '#42A5F5',
        barThickness: 30,
      },
    ],
  };

  public barChartData2: ChartData<'bar'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'High',
        data: [60, 48, 77, 89, 95],
        backgroundColor: '#66BB6A',
        barThickness: 30,
      },
    ],
  };

  days = [
    { name: 'Tue', date: 20 },
    { name: 'Wed', date: 20 },
    { name: 'Thur', date: 20 },
    { name: 'Fri', date: 20 },
    { name: 'Sat', date: 20 },
    { name: 'Sun', date: 20 },
  ];

  icons = [
    'assets/icons/temperature.png',
    'assets/icons/rainfall.png',
    'assets/icons/wind.png',
    'assets/icons/Humidity.svg',
  ];

  getSeverityClass(label: string): string {
    switch (label.toLowerCase()) {
      case 'extreme':
        return 'severity-extreme-1';
      case 'high':
        return 'severity-high-1';
      case 'moderate':
        return 'severity-moderate-1';
      default:
        return '';
    }
  }
}
