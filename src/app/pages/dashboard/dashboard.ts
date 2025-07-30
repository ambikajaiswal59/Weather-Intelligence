import { Component, ElementRef, ViewChild, OnInit, AfterViewInit,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../data-service/data-service';
import { MapWeather } from '../../components/map-weather/map-weather';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../../services/weather';

interface HazardItem {
  state: string;
  time: string;
  date: string;
  hazardType: string;
  district: string;
  city: string;
}
interface HourlyWeather {
  time: string;
  temp: number;
  rain: number;
  wind: number;
  chanceOfRain: any;
  icon: string;
}

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
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MapWeather, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit  {
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
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


  hourlyData: HourlyWeather[] = [];
  weatherData: DailyWeather[] = [];

  constructor(private dataService: DataService,private cdr: ChangeDetectorRef,private WeatherService: WeatherService) {}

  ngOnInit(): void {
    //this.fetchWeatherData();
  }

  ngAfterViewInit(): void {
    this.WeatherService.location$.subscribe((location: string) => {
    this.fetchWeatherData(location);
  });
  }

   toggleAccordion(panel: string) {
    this.activeAccordion = this.activeAccordion === panel ? '' : panel;

    if (this.scrollContainer && panel !== 'hourly') {
      setTimeout(() => {
        this.scrollContainer.nativeElement.scrollLeft = 0;
        this.updateScrollButtons();
      }, 300);
    }
  }
scrollLeft() {
  if (this.scrollContainer?.nativeElement) {
    this.scrollContainer.nativeElement.scrollLeft -= 150;
    this.updateScrollButtons();
  }
}

scrollRight() {
  if (this.scrollContainer?.nativeElement) {
    this.scrollContainer.nativeElement.scrollLeft += 150;
    this.updateScrollButtons();
  }
}

  private updateScrollButtons() {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;

    this.atScrollStart = el.scrollLeft === 0;
    this.atScrollEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
  }


  // #region Fetch Weather data
  fetchWeatherData = (location: string = 'Varanasi,India') => {
    this.loading = true;
    this.dataService.getWeatherForecast(location).subscribe({
      next: (data: any) => {
        this.location = data.location;
        this.current = data.current;
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

        this.hourlyData = data.forecast.forecastday[0].hour.map(
          (hour: any) => ({
            time: hour.time.split(' ')[1],
            temp: hour.temp_c,
            rain: hour.precip_mm,
            chanceOfRain: hour.chance_of_rain,
            wind: hour.wind_kph,
            icon: hour.condition.icon,
          })
        );

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
        this.activeAccordion = 'hourly';
        this.loading = false;
        this.cdr.detectChanges();
        
      },
      error: (err: any) => {
        console.error('Weather API error:', err);
        this.loading = false;
      },
    });
  }
  // #Endregion
  toggleForecast() {
    this.showForecast = !this.showForecast;
  }
  // #region Scroll

  // #Endregion
  
  // #region Hazard Risk
  hazardData: HazardItem[] = [
    {
      state: 'Uttar Pradesh',
      time: '10:00',
      date: '2025-07-20',
      hazardType: 'Flood',
      district: 'Lucknow',
      city: 'Lucknow',
    },
    {
      state: 'Uttar Pradesh',
      time: '11:30',
      date: '2025-07-19',
      hazardType: 'Heatwave',
      district: 'Varanasi',
      city: 'Varanasi',
    },
    {
      state: 'Uttar Pradesh',
      time: '08:15',
      date: '2025-07-18',
      hazardType: 'Thunderstorm',
      district: 'Kanpur',
      city: 'Kanpur',
    },
    {
      state: 'Uttar Pradesh',
      time: '13:45',
      date: '2025-07-21',
      hazardType: 'Cold Wave',
      district: 'Agra',
      city: 'Agra',
    },
    {
      state: 'Uttar Pradesh',
      time: '09:00',
      date: '2025-07-21',
      hazardType: 'Flood',
      district: 'Gorakhpur',
      city: 'Gorakhpur',
    },
  ];

  hazardTypes = Array.from(new Set(this.hazardData.map((h) => h.hazardType)));
  districts = Array.from(new Set(this.hazardData.map((h) => h.district)));

  get filteredHazards(): HazardItem[] {
    if (!this.selectedHazard && !this.selectedDistrict) {
      return this.hazardData;
    }

    return this.hazardData.filter(
      (h) =>
        (!this.selectedHazard || h.hazardType === this.selectedHazard) &&
        (!this.selectedDistrict || h.district === this.selectedDistrict)
    );
  }
  toggleIcon() {
    this.isOpen = !this.isOpen;
  }
  // #endregion
}
