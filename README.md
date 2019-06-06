# Ejemplo de sistema de recomendación utilizando autoencoders

El modelo está desarrollado en `pytorch` y su implementación se puede encontrar
en [el módulo model](model).

* [Explicación de autoencoders](Autoencoders.ipynb).
* [Entrenamiento para el sistema de recomendación](Entrenamiento.ipynb).

Se puede correr una aplicación de ejemplo mediante un contenedor docker con
los siguientes comandos.

```
    docker build . --tag recsys_example
    docker run -i -p 8899:8899 recsys_example
```

Se abrirá una aplicación en el puerto 8899 con la siguiente pinta.

![](static/screen_cap.png)