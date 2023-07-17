    /* API by IP address */
    const url =  `https://ipapi.co/json/`
    let geoData;
    /* data with all cities with population >30000 geodata json */
    //Source: https://public.opendatasoft.com/explore/dataset/geonames-all-cities-with-a-population-1000/table/?disjunctive.cou_name_en&sort=name
    const url2 = "/data/geo30000.json"
    /* array for predictive search results */
    var searchArray = [];
    /* array for objects to be displayed */
    var viewArray = [
    {
        "name": "Sydney",
        "ascii_name": "Sydney",
        "country_code": "AU",
        "cou_name_en": "Australia",
        "timezone": "Australia/Sydney",
        "modification_date": "2023-02-16",
        "coordinates": {
            "lon": 151.20732,
            "lat": -33.86785
        }
    },
    {
        "name": "San Francisco",
        "ascii_name": "San Francisco",
        "country_code": "US",
        "cou_name_en": "United States",
        "timezone": "America/Los_Angeles",
        "modification_date": "2022-03-09",
        "coordinates": {
            "lon": -122.41942,
            "lat": 37.77493
        }
    },
    {
        "name": "Paris",
        "ascii_name": "Paris",
        "country_code": "FR",
        "cou_name_en": "France",
        "timezone": "Europe/Paris",
        "modification_date": "2023-02-09",
        "coordinates": {
            "lon": 2.3488,
            "lat": 48.85341
        }
    }
    ];

    /* d3 clock variable */
    var w = h = 280,
    c = w/2,
    radius = (w - w/8)/2,
    label_radius = (w - w/3.2)/2,
    tick_radius = radius*130/140,
    hour_radius = w/4,
    min_radius = w/2.6,
    sec_radius = w/2.5,
    yoffset = w/40,
    pi = Math.PI;
    var hour_num = [
        "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "1", "2"
    ]

    /* limit the number of predictive search results */
    var num_search = 10;
    /* limit the number of items to be displayed */
    var limit_view = 12;
    /* highlighted item in predictive search  */
    var selected = 0;
    /* Luxon DateTime */ 
    var DateTime = luxon.DateTime;

    /* search handling variables */
    var search = document.getElementById('search-bar');
    var timeout = null;


    /* Fetch client location API */
    async function getGeoApi() {
        const res = fetch(url)
        .then(response => response.json())
        .then(data => {
            geoData =data;
            currentCity();
        });
        return res;
    }

    /* display clock by client ip address */
    async function currentCity() {
        geoData["name"] = geoData.city + " ⌂";
        geoData["country"] = geoData.country_name;
        geoData["coordinates"] = { "lat": geoData.latitude, "lon":geoData.longitude}
        geoData["daylight"] = await daylight(geoData.latitude, geoData.longitude, geoData.timezone)
        viewArray.unshift(geoData);
        view();
    }

    
    /* key press event handling */
    search.addEventListener('keydown', function (e) {
        // enter key
        if (e.key == "Enter") {
            e.preventDefault();
            doSearch(selected);
            selected = 0;
            search.blur();
            return
        }
        // arrow up
        else if (e.key == "ArrowUp" && selected > 0) {
            e.preventDefault();
            document.getElementById("city"+selected).classList.remove('active');
            selected--;
            document.getElementById("city"+selected).classList.add('active');
            return
        }
        // arrow down 
        else if (e.key == "ArrowDown" ) {
            e.preventDefault();
            if (selected == searchArray.length-1)
                return;
            document.getElementById("city"+selected).classList.remove('active');
            selected++;
            document.getElementById("city"+selected).classList.add('active');
            return
        }
    /* Wait until client finishes typing to search */
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            loadCity(e);
        }, 100);
        selected = 0;

    });


    /* Load suggestions when input has focus */
    search.addEventListener('focus', function (e) {
        if (document.getElementById("search-bar").value.length > 0)
            loadCity(e);
    });

    /* Remove suggestions when input lacks focus  */
    search.addEventListener("focusout", function (e) {
        noFocus();
    });

    /* focus out on touch */
    document.querySelector("*").addEventListener("touchend", function (e) {
        noFocus();
    })

    /* Remove suggestions when out of focus */
    function noFocus() {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            document.querySelector(".search-list").innerHTML = ""
        }, 100);      
    } 

    /* Load suggestions by user input  */
    async function loadCity(e) {
        //user input
        query = removeAccents(document.getElementById("search-bar").value.toLowerCase().trim());
        //initialize previous search
        searchArray = [];

        fetch(url2)
        .then(response => response.json())
        .then(data => {
        if (query.length > 0) {
            data.map(x=>{
                if(removeAccents(x.name.toLowerCase()).startsWith(query) 
                && !searchArray.some(item => item.geoname_id === x.geoname_id)){
                    searchArray.push(x);
                }
            });
            //sort by population size & limit result
            searchArray = searchArray.sort((a, b) => {
                if (a.population < b.population)
                    return 1;
                if (a.population > b.population)
                    return -1;
                return 0;
            }).slice(0, num_search);
        }
        // display suggestions
        let searchList = "";
        for (let i=0; i<searchArray.length; i++) {        
            searchList += "<li id=city"+i+" onclick=doSearch("+i+")>"+searchArray[i].name
                +" ("+searchArray[i].country_code
                + ")</li>";
        }
        document.querySelector(".search-list").innerHTML=searchList;
        if (searchArray.length > 0) document.getElementById("city"+selected).classList.add('active');
        });
    }


    /* remove accents in string */
    function removeAccents(s) {
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    /* get selected item from search and update view */
    async function doSearch(i) { 
        if (searchArray.length>0) {
            viewArray.unshift(searchArray[i]);
            if (viewArray.length>limit_view) 
                viewArray.pop()
            viewArray[0]["daylight"] = await daylight(viewArray[0].coordinates.lat, 
                viewArray[0].coordinates.lon, 
                viewArray[0].timezone);
        }
        view();
    }

    //draw clock face
    function draw() {

        var svg = d3.selectAll(".clock")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

        var clock = svg.append("g")

        //hours labels
        var hours = clock.selectAll(".hours")
        .data(hour_num).enter()
        .append("text")
        .attr("class", "hours")
        .attr("x", function(d, i) {
            return label_radius * Math.cos(i * pi/6) + c;
        })
        .attr("y", function(d, i) {
            return label_radius * Math.sin(i * pi/6) + c + yoffset;
        })
        .append("tspan")
        .attr("text-anchor", "middle")
        .text(function(d) {
                return d;
        })
        .style("font-size", String(w/15)+"px")

        // hours ticks
        var hourtick = clock.selectAll("hourtick")
        .data(d3.range(0, 12))
        .enter()
        .append("line")
        .attr("class", "hourtick")
        .attr('x1', function(d, i) {
            return tick_radius * Math.cos(i * pi/6)+c;
        })
        .attr("y1", function(d, i) {
            return tick_radius * Math.sin(i * pi/6)+c;
        })
        .attr('x2', function(d, i) {
            return radius * Math.cos(i * pi/6)+c;
        })
        .attr('y2', function(d, i) {
            return radius * Math.sin(i * pi/6)+c;
        })
        .attr("stroke-width", w/60);

        //minutes ticks
        var minutes = clock.selectAll("minutes")
        .data(d3.range(0, 60))
        .enter()
        .append("line")
        .attr("class", "minutes")
        .attr('x1', function(d, i) {
            return tick_radius * Math.cos(i * pi/30)+c;
        })
        .attr("y1", function(d, i) {
            return tick_radius * Math.sin(i * pi/30)+c;
        })
        .attr('x2', function(d, i) {
            return radius * Math.cos(i * pi/30)+c;
        })
        .attr('y2', function(d, i) {
            return radius * Math.sin(i * pi/30)+c;
        })
        .attr("stroke-width", w/128);

        //centre dot
        var centre = clock.append("circle")
        .attr("class", "centre")
        .attr("cx", c)
        .attr("cy", c)
        .attr("r", w/64)

        var shape = svg.selectAll("g").selectAll("*").attr("shape-rendering", "geometricPrecision")
    }

    //draw hands
    function hands() {
        for (let i=0;i<viewArray.length;i++) {

            var tz = viewArray[i].timezone;

            hour_radian = (getHours(tz)-3) * pi/6 + getMinutes(tz) * pi/360 + getSeconds(tz) * pi/21600;
            min_radian = (getMinutes(tz)-15) * pi/30;
            sec_radian = (getSeconds(tz)-15) * pi/30;

            var hands = [
                {
                    "class": "hour",
                    "radian": hour_radian,
                    "radius": hour_radius,
                    "width": w/60
                },
                {
                    "class": "min",
                    "radian": min_radian,
                    "radius": min_radius,
                    "width": w/100

                },
                {
                    "class": "sec",
                    "radian": sec_radian,
                    "radius": sec_radius,
                    "width": w/200
                }                    
            ]

            d3.select(`#clockbox${i} .clock svg g`).append("g")
            .selectAll("line")
            .data(hands)
            .enter()
            .append("line")
            .attr("class", d => d.class+"Hand")
            .attr("x1", c)
            .attr("y1", c)
            .attr("x2", d => d.radius * Math.cos(d.radian)+c)
            .attr("y2", d => d.radius * Math.sin(d.radian)+c)
            .attr("stroke-width", d => d.width)
            .transition().ease(d3.easeElastic.period(0.5))
            
            d3.selectAll("line").attr("shape-rendering", "geometricPrecision")

        }
    }

    /* Astronomy API: sunset and sunrise by latitude and logitude  */
    const apikey = "get key from https://ipgeolocation.io/"
    /* get sunset and sunrise time */
    async function daylight(lat, long, tz) {
        return fetch(`https://api.ipgeolocation.io/astronomy?apiKey=${apikey}&lat=${lat}&&long=${long}`)
            .then(response => response.json())
            .then(data => {
                var sunrise = DateTime.fromFormat(data.date+" "+data.sunrise + " " + tz, 'yyyy-MM-dd T z');
                var sunset = DateTime.fromFormat(data.date+" "+data.sunset + " " + tz,'yyyy-MM-dd T z');
                return {sunrise, sunset}
            })    
    }

    /* Determine if there is daylight */
    function dayOrNight () {
        for (let i=0;i<viewArray.length;i++) {
            var col = "rgb(248,244,255)"
            var now = DateTime.now().setZone(viewArray[i].timezone);
            if (viewArray[i].daylight!=undefined && now > viewArray[i].daylight.sunrise && now < viewArray[i].daylight.sunset ) {
                col = "rgb(56,56,56)"
            } else if (viewArray[i].daylight!=undefined && (now < viewArray[i].daylight.sunrise || now > viewArray[i].daylight.sunset)) {
                document.getElementById(`clockbox${i}`).style.backgroundImage = "linear-gradient(to top, #11a9a9 0%, #330867 100%)"
                document.querySelector(`#clockbox${i} .city`).style.color = col;
                document.querySelector(`#clockbox${i} .country`).style.color = col;
                document.querySelector(`#clockbox${i} .digital`).style.color = col;
                document.querySelector(`#clockbox${i} .delete-button`).style.color = col;
            }
            d3.select(`#clockbox${i} .clock`).selectAll("line").attr("stroke", col)
            d3.select(`#clockbox${i} .clock`).select("svg").selectAll("text").attr("font-color",col)
            d3.select(`#clockbox${i} .clock`).selectAll("text").attr("fill", col)
            d3.select(`#clockbox${i} .clock`).select(".centre").attr("fill", col).attr("stroke", col)
        }
    }


    // update view
    function view() {
        var divs = "";
        const region = new Intl.DisplayNames(['en'], {type: 'region'});
        for (let i = 0; i < viewArray.length; i++) {
            divs += `<div class="clockbox" id="clockbox${i}">
                    <div class="city">${viewArray[i].name}</div>
                    <div class="country">
                        ${(viewArray[i].country==undefined)? (region.of(viewArray[i].country_code)) : viewArray[i].country} 
\                    </div>
                    <div class="clock"></div>
                    <div class="digital">${getDate(viewArray[i].timezone)}</div>
                    <div class="delete-button" onClick=deleteItem(${i})>&times;</div>
                    </div>
                    `;
        };
        document.querySelector('.container').innerHTML = divs;
        draw();
        hands();
        dayOrNight();
    }   

    /* delete items to be displayed */
    function deleteItem(i) {
        viewArray.splice(i, 1);
        view();
    }

    /* format time */
    function getDate(tz) {
        return DateTime.now().setZone(tz).toFormat('ccc, tt');
    }
    
    function getHours(tz) {
        return DateTime.now().setZone(tz).toFormat('h');
    }

    function getMinutes(tz) {
        return DateTime.now().setZone(tz).toFormat('m');
    }

    function getSeconds(tz) {
        return DateTime.now().setZone(tz).toFormat('s');
    }

    /* update time in view */
    function updateTime() {
        for (let i=0; i<viewArray.length; i++) {
            var digital = document.querySelector(`#clockbox${i} .digital`);
            if (digital != null) digital.innerHTML = getDate(viewArray[i].timezone);
        }
    }

    // //move hands
    function rotateHands() {

        for (let i=0;i<viewArray.length;i++) {
            var tz = viewArray[i].timezone;
            hourRadian = (getHours(tz)-3) * pi/6 + getMinutes(tz) * pi/360 + getSeconds(tz) * pi/21600;
            minRadian = (getMinutes(tz)-15) * pi/30;
            secRadian = (getSeconds(tz)-15) * pi/30;

            var hourMove = d3.select(`#clockbox${i} .clock`).select("svg").select(".hourHand")
            .transition().ease(d3.easeElastic.period(0.5))
            .attr("x1", c)
            .attr("y1", c)
            .attr("x2", hour_radius * Math.cos(hourRadian)+c)
            .attr("y2", hour_radius * Math.sin(hourRadian)+c)

            var minMove = d3.select(`#clockbox${i} .clock`).select("svg").select(".minHand")
            .transition().ease(d3.easeElastic.period(0.5))
            .attr("x1", c)
            .attr("y1", c)
            .attr("x2", min_radius * Math.cos(minRadian)+c)
            .attr("y2", min_radius * Math.sin(minRadian)+c)

            var secMove = d3.select(`#clockbox${i} .clock`).select("svg").select(".secHand")
            .transition().ease(d3.easeElastic.period(0.5))
            .attr("x1", c)
            .attr("y1", c)
            .attr("x2", sec_radius * Math.cos(secRadian)+c)
            .attr("y2", sec_radius * Math.sin(secRadian)+c)
        }
    }

    (async () => {
        for (var x of viewArray) x["daylight"] =  await daylight(x.coordinates.lat, x.coordinates.lon, x.timezone)
        await getGeoApi();
        }  
    )();

    /* update time at given interval */
    setInterval(() => {
        updateTime();
        rotateHands();
    }, 100);
    setInterval(() => {
        dayOrNight();
    }, 1000);

