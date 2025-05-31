import { useEffect, useState } from 'react';

interface WeatherItem {
  dt_txt: string;
  main: { temp: number };
  weather: { description: string; icon: string }[];
}

interface ForecastData {
  city: { name: string; country: string };
  list: WeatherItem[];
}

const getClothingRecommendation = (temp: number, description: string) => {
  if (description.includes('lluvia')) return 'Lleva paraguas y ropa impermeable.';
  if (temp < 10) return 'Usa abrigo, bufanda y ropa cálida. 🧣🧤';
  if (temp < 20) return 'Lleva una chaqueta ligera. 🧥';
  if (temp < 28) return 'Ropa cómoda y fresca. 👗👕👖';
  return 'Usa ropa muy ligera, protector solar y mantente hidratado. 🧢🕶️🧴☂️';
};

const dayLabels = ['Hoy', 'Mañana', 'Pasado mañana'];

// Horas a mostrar
const hoursToShow = ['07:00:00', '13:00:00', '18:00:00'];

// Helper para encontrar el pronóstico más cercano a una hora deseada
function findClosestForecast(list: WeatherItem[], dayStr: string, targetHour: string) {
  // Filtra solo los pronósticos de ese día
  const dayForecasts = list.filter(w => w.dt_txt.startsWith(dayStr));
  if (dayForecasts.length === 0) return null;

  // Busca el más cercano a la hora deseada
  let minDiff = Infinity;
  let closest: WeatherItem | null = null;
  for (const item of dayForecasts) {
    const [, time] = item.dt_txt.split(' ');
    const diff = Math.abs(
      parseInt(time.split(':')[0]) - parseInt(targetHour.split(':')[0])
    );
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }
  return closest;
}

const ClimaAuto = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError('API Key no definida');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=es`
        )
          .then((res) => {
            if (!res.ok) throw new Error('Error al obtener el pronóstico');
            return res.json();
          })
          .then((data: ForecastData) => {
            setForecast(data);
            setError(null);
          })
          .catch((err) => {
            setError(err.message);
          });
      },
      (err) => {
        if (err.code === 1) setError('Permiso de ubicación denegado');
        else if (err.code === 2) setError('Ubicación no disponible');
        else if (err.code === 3) setError('Tiempo de espera agotado');
        else setError('Error desconocido de geolocalización');
      }
    );
  }, [apiKey]);

  // Obtiene los pronósticos de cada día a las horas deseadas
  const dailyForecast = forecast
    ? [0, 1, 2].map((offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const dayStr = date.toISOString().split('T')[0];
        const forecastsForDay = hoursToShow.map((hour) => {
          const item = findClosestForecast(forecast.list, dayStr, hour);
          return item
            ? {
                hour: hour.slice(0, 5),
                temp: item.main.temp,
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                recommendation: getClothingRecommendation(item.main.temp, item.weather[0].description),
              }
            : null;
        });
        return {
          date: dayStr,
          forecasts: forecastsForDay,
        };
      })
    : [];

  const selectedDayForecast = dailyForecast[selectedDay];

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">Pronóstico y recomendación de vestimenta</h2>
      {error && <p className="text-red-500">{error}</p>}

      {forecast && (
        <div>
          <h3 className="text-lg font-semibold">
            {forecast.city.name}, {forecast.city.country}
          </h3>
          <div className="flex gap-2 my-4">
            {dayLabels.map((label, idx) => (
              <button
                key={label}
                className={`px-3 py-1 rounded ${selectedDay === idx ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSelectedDay(idx)}
              >
                {label}
              </button>
            ))}
          </div>
          {selectedDayForecast ? (
            <div className="mb-4">
              <p className="font-bold">
                {dayLabels[selectedDay]} (
                {
                  (() => {
                    const [year, month, day] = selectedDayForecast.date.split('-');
                    return `${day}/${month}/${year}`;
                  })()
                }
                )
              </p>
              {selectedDayForecast.forecasts.map((item, idx) =>
                item ? (
                  <div key={idx} className="mb-2 p-2 border rounded">
                    <p className="font-semibold">⏰ {item.hour} hs</p>
                    <p>🌡 Temperatura: {item.temp} °C</p>
                    <p>🌥 Condición: {item.description}</p>
                    <img
                      src={`https://openweathermap.org/img/wn/${item.icon}@2x.png`}
                      alt="Icono del clima"
                    />
                    <p className="mt-1 font-semibold">Recomendación: {item.recommendation}</p>
                  </div>
                ) : (
                  <div key={idx} className="mb-2 p-2 border rounded">
                    <p className="font-semibold">⏰ {hoursToShow[idx].slice(0, 5)} hs</p>
                    <p>No hay datos para este horario.</p>
                  </div>
                )
              )}
            </div>
          ) : (
            <p>No hay datos para este día.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ClimaAuto;
