// ****************************************************************************
// ************************** COMPONENTES ************************************* 
// ****************************************************************************

/**
 * Clase que maneja la comunicación con la API del modelo de sistema de 
 * recomendación.
 */
class RecommenderSystem{
    /**
     * Constructor
     */
    constructor(){
        this.min_popularity = 50;
        this.movies = null;
        this.callbacks = [];
        this.interactions = [];
        this.recommended = [];
    }


    /**
     * Obtiene los datos de peliculas del servidor y los datos de scores cuando
     * no hay ninguna interacción. También llama a refresh scores.
     */
    init(){
        const self = this;
        return d3.json("movies").then(function(d){
            self.movies = Object.values(d)
                .filter(x => x.popularity >= self.min_popularity);
            self.refresh_scores();
        })
    }

    /**
     * Añade una referencia a una película con la que el usuario ha interactuado.
     * @param {*} movie Referencia a una película en movies. 
     */
    add_interaction(movie){
        if(!this.interactions.includes(movie)){
            this.interactions.unshift(movie);
            this.refresh_scores();
        }
        return this;
    }

    /**
     * Elimina una película con la que un usuario ha interactuado.
     * @param {*} movie Referencia a una película en interactions.
     */
    remove_interaction(movie){
        if(this.interactions.includes(movie)){
            this.interactions = this.interactions.filter(x => x != movie);
            this.refresh_scores();
        }
        return this;
    }

    /**
     * Actualiza los scores de cada película en función de las nuevas 
     * interacciones.
     */
    refresh_scores(){
        
        const self = this;

        var url_query = "predict?";
        for(var i = 0; i < this.interactions.length; ++i){
            url_query += "iid=" + this.interactions[i].item_id;
            if(i < this.interactions.length - 1) url_query += "&";
        }

        d3.json(url_query).then(function(d){
            for(var i = 0; i < self.movies.length; ++i)
                self.movies[i].score = d[self.movies[i].item_id];
            self.update_recommendations();
            self.fire_callbacks();
        })

        return this;

    }

    /**
     * 
     */
    update_recommendations(){
        this.recommended = []; // Vacío el array de recomendaciones.
        const sorted_movies = this.movies
            .slice(0).sort((a, b) => b.score - a.score); 
        for(var i = 0; i < sorted_movies.length; i++) {
            if(!this.interactions.includes(sorted_movies[i]))
                this.recommended.unshift(sorted_movies[i]);
            if(this.recommended.length >= 10) break;
        }
    }

    /**
     * Ejecuta los callbacks registrados para cuando se refresquen los scores
     * de las películas.
     */
    fire_callbacks(){
        for(var i = 0; i < this.callbacks.length; ++i) this.callbacks[i](this);
    }

    /**
     * Registra una llamada para cuando se refrescan los scores.
     * @param {*} callback Función que toma como parámetro una referencia a
     * sí mismo.
     */
    on_refresh(callback){
        this.callbacks.push(callback);
    }

};


/**
 * Clase que maneja el gráfico de representación de las películas.
 */
class BubbleChart{
    /**
     * 
     * @param {*} container_selector 
     * @param {*} recommender 
     */
    constructor(container_selector, recommender){

        this.colors = {
            primary: "#004481",
            accent: "#5BBEFF"
        }
        this.selected_genre = "Romance";
        this.recommender = recommender;

        const self = this;
        this.recommender.on_refresh(function(){
            self.update_chart();
        });

        this.container_selector = container_selector;
        this.margin = {top: 100, bottom: 200, left: 150, right: 150};
        this.create_chart();
    }
    /**
     * Devuelve la anchura del contendor del gráfico.
     */
    get container_width(){
        return Number(
            d3.select(this.container_selector).style('width').slice(0, -2)
        )
    }
    /**
     * Devuelve la altura.
     */
    get container_height(){
        return Number(
            d3.select(this.container_selector).style('height').slice(0, -2)
        )
    }
    /**
     * Devuelve la altura del area de ploteo.
     */
    get height(){
        return this.container_height - this.margin.top - this.margin.bottom;
    }
    /**
     * Devuelve la anchura del area de ploteo.
     */
    get width(){
        return this.container_width - this.margin.left - this.margin.right;
    }

    get_scale_x(){

        const movies = this.recommender.movies;
        var max_score = 0;
        for(var i = 0; i < movies.length; ++i)
            if(movies[i].score > max_score) max_score = movies[i].score;

        return d3.scaleLinear().domain([0, max_score]).range([0, this.width])
    }

    get_scale_y(){

        const max_pop = this.recommender.movies.reduce(
            (a, b) => (a.popularity > b.popularity)? a.popularity: b.popularity
        )
        
        return d3.scaleLog()
        .base(10)
        .domain([this.recommender.min_popularity, 3428])
        .range([this.height, 0]);
    }

    /**
     * Crea el gráfico donde se pintan las cosas
     */
    create_chart(){

        const self = this;

        this.svg = d3.select(this.container_selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr(
                "transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")"
            );
        
        const x = this.get_scale_x();
        const y = this.get_scale_y();
        
        this.svg.selectAll("dot")
                .data(this.recommender.movies)
                .enter()
                .append("circle")
                .attr("cx", function(d){return x(d.score)})
                .attr("cy", function(d){return y(d.popularity)})
                .attr("r", function(d){return 5})
                .style("fill", function(d){ return self.colors.primary;})
                .style("fill-opacity", 0.8)
                .style("cursor", "pointer")
                .on("click", function(e){ self.recommender.add_interaction(e);})


        this.create_tooltip();
        this.create_axes();
    }

    /**
     * 
     */
    create_tooltip(){
        var tooltip = d3.select(this.container_selector)
        .append("div")
          .style("opacity", 0)
          .attr("class", "tooltip")
          .style("z-index", "999999")
          .style("position", "absolute")
          .style("background-color", "black")
          .style("border-radius", "5px")
          .style("padding", "10px")
          .style("color", "white")
        this.svg.selectAll("circle").on("mouseover", function(d){ 
            tooltip.text(d.movie_title + " " + d.score.toFixed(2)); 
            return tooltip.style("opacity", 1)
                .style("left", (d3.event.pageX + 10) + "px")		
                .style("top", (d3.event.pageY - 28) + "px");;
        })
    }

    /**
     * 
     */
    create_axes(){

        const x = this.get_scale_x();
        const y = this.get_scale_y();

        this.svg.append("g")
            .attr("transform", 
                "translate(0," + (this.height + this.margin.bottom / 6) + ")")
            .call(d3.axisBottom(x))
            .attr("class", "chart-axis x-axis");

        this.svg.append("g")
            .attr("class", "chart-axis y-axis")
            .attr("transform", "translate(" + (- this.margin.left / 4) + ",0)")
            .call(d3.axisLeft(y));

        this.svg.append("text")             
            .attr("transform",
                "translate(" + (this.width/2) + " ," + 
                                (this.height + 100) + ")")
            .style("text-anchor", "middle")
            .text("Recommendation score")
            .attr("class", "axis-label")

        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left * 0.8)
            .attr("x", 0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Popularity")
            .attr("class", "axis-label")
    }

    /**
     * 
     */
    update_chart(){
        var x = this.get_scale_x();
        var y = this.get_scale_y();
        const self = this;
        this.svg
            .selectAll("circle")
            .data(this.recommender.movies)
            .transition()
            .duration(500)
            .attr("cx", function(d){return x(d.score)})
            .style("fill", function(d){
                return (d.genre.includes(self.selected_genre))? 
                    self.colors.accent: self.colors.primary;})
            .style("fill-opacity", function(d){
                return (self.recommender.interactions.includes(d))? 0.4: 0.8;})

        d3.select(".x-axis").call(d3.axisBottom(x))
        d3.select(".y-axis").call(d3.axisLeft(y))
    }
}


// ****************************************************************************
// ********************************** APP ************************************* 
// ****************************************************************************

Vue.use(Vuetify);

Vue.component('movie-thumbnail',{
    props: {'movie':{}, 'removable':{default: true}},
    data: function(){
        return{
            active: false
        }
    },
    template: 
    `
    <div class="movie-thumbnail-wrapper" v-on:mouseover="active = true" 
        v-on:mouseleave="active = false">
        <img :src="movie.poster_url"/>
        <div class="movie-thumbnail-footer" v-show="active">
            <a :href="movie.imdb_url" target="_blank">{{movie.movie_title}}</a>
        </div>
        <div class="movie-thumbnail-button-wrapper" v-show="removable && active">
            <v-btn icon small color="#bdbdbd" v-on:click="$emit('remove-movie', movie)">
                <v-icon>close</v-icon>
            </v-btn>
        </div>
    </div>
    `
})

new Vue({
    el: "#app",
    data: {
        rs: null,
        chart: null
    },
    created: function(){
        const self = this;
        this.rs = new RecommenderSystem();
        this.rs.init().then(function(){
            self.chart = new BubbleChart("#chart-panel", self.rs);
        });
    },
    methods: {
        remove_movie: function(movie){
            this.rs.remove_interaction(movie);
        }
    }
})

