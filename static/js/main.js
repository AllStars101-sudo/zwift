"use strict";
var UserStatus;
(function (UserStatus) {
    UserStatus["LoggedIn"] = "Logged In";
    UserStatus["LoggingIn"] = "Logging In";
    UserStatus["LoggedOut"] = "Logged Out";
})(UserStatus || (UserStatus = {}));
var Default;
(function (Default) {
    Default["PIN"] = "1234";
})(Default || (Default = {}));
var WeatherType;
(function (WeatherType) {
    WeatherType["Cloudy"] = "Cloudy";
    WeatherType["Rainy"] = "Rainy";
    WeatherType["Stormy"] = "Stormy";
    WeatherType["Sunny"] = "Sunny";
})(WeatherType || (WeatherType = {}));
const defaultPosition = () => ({
    left: 0,
    x: 0
});
const N = {
    clamp: (min, value, max) => Math.min(Math.max(min, value), max),
    rand: (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
};
const T = {
    format: (date) => {
        const hours = T.formatHours(date.getHours()), minutes = date.getMinutes(), seconds = date.getSeconds();
        return `${hours}:${T.formatSegment(minutes)}`;
    },
    formatHours: (hours) => {
        return hours % 12 === 0 ? 12 : hours % 12;
    },
    formatSegment: (segment) => {
        return segment < 10 ? `0${segment}` : segment;
    }
};

const useCurrentDateEffect = () => {
    const [date, setDate] = React.useState(new Date());
    React.useEffect(() => {
        const interval = setInterval(() => {
            const update = new Date();
            if (update.getSeconds() !== date.getSeconds()) {
                setDate(update);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [date]);
    return date;
};
const ScrollableComponent = (props) => {
    const ref = React.useRef(null);
    const [state, setStateTo] = React.useState({
        grabbing: false,
        position: defaultPosition()
    });
    const handleOnMouseDown = (e) => {
        setStateTo(Object.assign(Object.assign({}, state), { grabbing: true, position: {
                x: e.clientX,
                left: ref.current.scrollLeft
            } }));
    };
    const handleOnMouseMove = (e) => {
        if (state.grabbing) {
            const left = Math.max(0, state.position.left + (state.position.x - e.clientX));
            ref.current.scrollLeft = left;
        }
    };
    const handleOnMouseUp = () => {
        if (state.grabbing) {
            setStateTo(Object.assign(Object.assign({}, state), { grabbing: false }));
        }
    };
    return (React.createElement("div", { ref: ref, className: classNames("scrollable-component", props.className), id: props.id, onMouseDown: handleOnMouseDown, onMouseMove: handleOnMouseMove, onMouseUp: handleOnMouseUp, onMouseLeave: handleOnMouseUp }, props.children));
};
const WeatherSnap = () => {
    const [weather, setWeather] = React.useState('');
    const [temperature, setTemperature] = React.useState(null);

    const fetchWeather = async (latitude, longitude) => {
        // Get your free OpenWeatherMap API key by signing up at https://home.openweathermap.org/users/sign_up
        const apiKey ='67531f469868e5a6bb89333b4f5c439e';
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`);
        const data = await response.json();

        setWeather(data.weather[0].main);
        setTemperature(data.main.temp);
    };
    
    React.useEffect(() => {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                fetchWeather(position.coords.latitude, position.coords.longitude)
            })
        } else {
            alert('Geolocation is not supported');
        }
    }, []);
    
    return (
        React.createElement("span", { className: "weather" },
            React.createElement("i", { className: "weather-type fa-duotone fa-sun" }),
            React.createElement("span", { className: "weather-temperature-value" }, temperature),
            React.createElement("span", { className: "weather-temperature-unit" }, "°C"),
            React.createElement("span", { className: "weather-status" }, `(${weather})`)
        )
    );
}
const Reminder = () => {
    const given_name = document.body.getAttribute('given-name') || 'Guest';
    return (React.createElement("div", { className: "reminder" },
        React.createElement("div", { className: "reminder-icon" },
            React.createElement("i", { className: "fa fa-hand-peace-o" })),
        React.createElement("span", { className: "reminder-text" },
            `G'day, ${given_name}!`)));
};
const Time = () => {
    const date = useCurrentDateEffect();
    return (React.createElement("span", { className: "time" }, T.format(date)));
};
const Info = (props) => {
    return (React.createElement("div", { id: props.id, className: "info" },
        React.createElement(Time, null),
        React.createElement(WeatherSnap, null)));
};

const MenuSection = (props) => {
    const getContent = () => {
        if (props.scrollable) {
            return (React.createElement(ScrollableComponent, { className: "menu-section-content" }, props.children));
        }
        return (React.createElement("div", { className: "menu-section-content" }, props.children));
    };
    return (React.createElement("div", { id: props.id, className: "menu-section" },
        React.createElement("div", { className: "menu-section-title" },
            React.createElement("i", { className: props.icon }),
            React.createElement("span", { className: "menu-section-title-text" }, props.title)),
        getContent()));
};

const e = React.createElement;

class QuickNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startLocation: '',
      endLocation: '',
      isStartLocationVisible: false,
    };
  }

  handleStartLocationChange = (event) => {
    this.setState({ startLocation: event.target.value });
  };

  handleEndLocationChange = (event) => {
    this.setState({ endLocation: event.target.value });
  };

  handleFormSubmit = (event) => {
    event.preventDefault();
    fetch('/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start: this.state.startLocation, end: this.state.endLocation }),
    }).then(window.location.href = '/directions');
  };

  handleArrowClick = () => {
    this.setState((prevState) => ({
      isStartLocationVisible: !prevState.isStartLocationVisible,
    }));
  };

  render() {
    return e(
      'form',
      { id: 'quick-nav', onSubmit: this.handleFormSubmit, className: 'quick-nav-form' },
      e('input', {
        type: 'text',
        value: this.state.endLocation,
        onChange: this.handleEndLocationChange,
        placeholder: 'Where would you like to go?',
        className: 'quick-nav-input',
      }),
      e(
        'button',
        { type: 'button', onClick: this.handleArrowClick, className: 'quick-nav-button' },
        e('i', { className: this.state.isStartLocationVisible ? 'fa fa-arrow-left' : 'fa fa-arrow-right' })
      ),
      this.state.isStartLocationVisible &&
        e('div', { className: 'quick-nav-input-wrapper' },
          e('input', {
            type: 'text',
            value: this.state.startLocation,
            onChange: this.handleStartLocationChange,
            placeholder: 'Start location',
            className: 'quick-nav-input',
          }),
          e(
            'button',
            { type: 'submit', className: 'quick-nav-button' },
            e('i', { className: 'fa fa-check' })
          )
        )
    );
  }
}

ReactDOM.render(e(QuickNav), document.getElementById('root'));


const Weather = () => {
    const getDays = () => {
        return [{
                id: 1,
                name: "Mon",
                temperature: N.rand(10, 20),
                weather: WeatherType.Sunny
            }, {
                id: 2,
                name: "Tues",
                temperature: N.rand(10, 20),
                weather: WeatherType.Sunny
            }, {
                id: 3,
                name: "Wed",
                temperature: N.rand(20, 30),
                weather: WeatherType.Cloudy
            }, {
                id: 4,
                name: "Thurs",
                temperature: N.rand(0, 10),
                weather: WeatherType.Rainy
            }, {
                id: 5,
                name: "Fri",
                temperature: N.rand(10, 20),
                weather: WeatherType.Stormy
            }, {
                id: 6,
                name: "Sat",
                temperature: N.rand(20, 30),
                weather: WeatherType.Sunny
            }, {
                id: 7,
                name: "Sun",
                temperature: N.rand(0, 10),
                weather: WeatherType.Cloudy
            }].map((day) => {
            const getIcon = () => {
                switch (day.weather) {
                    case WeatherType.Cloudy:
                        return "fa-duotone fa-clouds";
                    case WeatherType.Rainy:
                        return "fa-duotone fa-cloud-drizzle";
                    case WeatherType.Stormy:
                        return "fa-duotone fa-cloud-bolt";
                    case WeatherType.Sunny:
                        return "fa-duotone fa-sun";
                }
            };
            return (React.createElement("div", { key: day.id, className: "day-card" },
                React.createElement("div", { className: "day-card-content" },
                    React.createElement("span", { className: "day-weather-temperature" },
                        day.temperature,
                        React.createElement("span", { className: "day-weather-temperature-unit" }, "\u00B0F")),
                    React.createElement("i", { className: classNames("day-weather-icon", getIcon(), day.weather.toLowerCase()) }),
                    React.createElement("span", { className: "day-name" }, day.name))));
        });
    };
    return (React.createElement(MenuSection, { icon: "fa-solid fa-sun", id: "weather-section", scrollable: true, title: "How's it look out there?" }, getDays()));
};
const Restaurants = () => {
    const getRestaurants = () => {
        return [{
                desc: "Tuesday, 8:00 pm.",
                id: 1,
                image: "",
                title: "Sydney Opera House->UNSW"
            }, {
                desc: "Wednesday, 9:00pm",
                id: 2,
                image: "",
                title: "George St -> Maroubra"
            }, {
                desc: "Sunday, 12:00pm",
                id: 3,
                image: "",
                title: "Mascot -> Sydney Intl Airport"
            }, {
                desc: "Friday, 6:00am",
                id: 4,
                image: "",
                title: "Coogee -> Bondi Beach"
            }].map((restaurant) => {
            const styles = {
                backgroundImage: `url(${restaurant.image})`
            };
            return (React.createElement("div", { key: restaurant.id, className: "restaurant-card background-image", style: styles },
                React.createElement("div", { className: "restaurant-card-content" },
                    React.createElement("div", { className: "restaurant-card-content-items" },
                        React.createElement("span", { className: "restaurant-card-title" }, restaurant.title),
                        React.createElement("span", { className: "restaurant-card-desc" }, restaurant.desc)))));
        });
    };
    return (React.createElement(MenuSection, { icon: "fa fa-history", id: "restaurants-section", title: "Your past trips" }, getRestaurants()));
};
const Movies = () => {
    const getMovies = () => {
        return [{
                desc: "The Sydney Opera House is an iconic architectural masterpiece located in Sydney, Australia, renowned for its distinctive sail-like design and hosting world-class performing arts events.",
                id: 1,
                icon: "fa-solid fa-galaxy",
                image: "https://media.architecturaldigest.com/photos/63d82d299dd44a3242d15ade/3:2/w_3000,h_2000,c_limit/GettyImages-982774858.jpg",
                title: "Sydney Opera House"
            }, {
                desc: "World-famous coastal paradise nestled in Sydney, Australia, celebrated for its golden sands, vibrant surf culture, and breathtaking ocean views.",
                id: 2,
                icon: "fa-solid fa-hat-wizard",
                image: "https://www.sydney.com/sites/sydney/files/styles/landscape_992x558/public/2022-04/164098-56.jpg?h=ba809569&itok=BqZVy1dW",
                title: "Bondi Beach"
            }, {
                desc: "Bustling waterfront precinct in Sydney, Australia, offering a vibrant blend of entertainment, dining, shopping, and stunning harbor views, making it a popular destination for locals and tourists alike.",
                id: 3,
                icon: "fa-solid fa-broom-ball",
                image: "https://www.darlingharbour.com/getmedia/f178f096-38af-4a70-bedc-94c1c5a5da26/darling-harbour-unhcrfireworks-2022-credit-henry-li-1_1.jpg",
                title: "Darling Harbour"
            }, {
                desc: "prominent observation deck situated atop Sydney Tower, offering breathtaking 360-degree views of the city skyline",
                id: 4,
                icon: "fa-solid fa-starship-freighter",
                image: "https://www.sydneytowereye.com.au/media/iauj4dnh/thumbnail_ste-rediscover-frontpagehero-1920x1080px.jpeg",
                title: "Sydney Tower Eye"
            }].map((movie) => {
            const styles = {
                backgroundImage: `url(${movie.image})`
            };
            const id = `movie-card-${movie.id}`;
            return (React.createElement("div", { key: movie.id, id: id, className: "movie-card" },
                React.createElement("div", { className: "movie-card-background background-image", style: styles }),
                React.createElement("div", { className: "movie-card-content" },
                    React.createElement("div", { className: "movie-card-info" },
                        React.createElement("span", { className: "movie-card-title" }, movie.title),
                        React.createElement("span", { className: "movie-card-desc" }, movie.desc)),
                    React.createElement("i", { className: movie.icon }))));
        });
    };
    return (React.createElement(MenuSection, { icon: "fa-solid fa-camera-movie", id: "movies-section", scrollable: true, title: "Popular spots around you" }, getMovies()));
};
const UserStatusButton = (props) => {
    const { userStatus, setUserStatusTo } = React.useContext(AppContext);
    const handleOnClick = () => {
        setUserStatusTo(props.userStatus);
    };
    return (React.createElement("button", { id: props.id, className: "user-status-button clear-button", disabled: userStatus === props.userStatus, type: "button", onClick: handleOnClick },
        React.createElement("i", { className: props.icon })));
};
const Menu = () => {
    return (React.createElement("div", { id: "app-menu" },
        React.createElement("div", { id: "app-menu-content-wrapper" },
            React.createElement("div", { id: "app-menu-content" },
                React.createElement("div", { id: "app-menu-content-header" },
                    React.createElement("div", { className: "app-menu-content-header-section" },
                        React.createElement(Info, { id: "app-menu-info" }),
                        React.createElement(Reminder, null)),
                    React.createElement("div", { className: "app-menu-content-header-section" },
                        React.createElement(UserStatusButton, { icon: "fa-solid fa-arrow-right-from-arc", id: "sign-out-button", userStatus: UserStatus.LoggedOut }))),
                React.createElement(QuickNav, null),
                React.createElement(Weather, null),
                React.createElement(Restaurants, null),
                React.createElement(Movies, null)))));
};
const Background = () => {
    const { userStatus, setUserStatusTo } = React.useContext(AppContext);
    const handleOnClick = () => {
        if (userStatus === UserStatus.LoggedOut) {
            setUserStatusTo(UserStatus.LoggedIn);
        }
    };
    return (React.createElement("div", { id: "app-background", onClick: handleOnClick },
        React.createElement("div", { id: "app-background-image", className: "background-image" })));
};
const Loading = () => {
    return (React.createElement("div", { id: "app-loading-icon" },
        React.createElement("i", { className: "fa-solid fa-spinner-third" })));
};
const AppContext = React.createContext(null);
const App = () => {
    const [userStatus, setUserStatusTo] = React.useState(UserStatus.LoggedOut);
    const getStatusClass = () => {
        return userStatus.replace(/\s+/g, "-").toLowerCase();
    };
    return (React.createElement(AppContext.Provider, { value: { userStatus, setUserStatusTo } },
        React.createElement("div", { id: "app", className: getStatusClass() },
            React.createElement(Info, { id: "app-info" }),
            React.createElement(Menu, null),
            React.createElement(Background, null),
            React.createElement("div", { id: "sign-in-button-wrapper" },
                React.createElement(UserStatusButton, { icon: "fa-solid fa-arrow-right-to-arc", id: "sign-in-button", userStatus: UserStatus.LoggedIn })),
            React.createElement(Loading, null))));
};
ReactDOM.render(React.createElement(App, null), document.getElementById("root"));