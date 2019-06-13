const express = require("express");
const tareasLogic = require("../logic/tareas");
const bodyParser = require("body-parser");

const tareasRouter = express.Router();
tareasRouter.use(bodyParser.json());

/**
 * Función aplicada por defecto a todas las respuestas.
 * Aplica el código de estado 200 a la respuesta y la cabecera
 * Content-Type igual a application/json.
 *
 * Si algún método necesita usar otro código u otas cabeceras
 * puede hacerlo en el método mismo.
 *
 * @param {object} req Petición HTTP
 * @param {object} res Respuesta HTTP
 * @param {object} next siguiente middleware a ejecutarse
 */
function allRequest(req, res, next) {
  res.statusCode = 200;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  next();
}

/**
 *
 * @param {object} req Petición HTTP
 * @param {object} res  Respuesta HTTP
 * @param {object} next  siguiente middleware a ejecutarse
 */
function showOptions(req, res, next) {
  res.setHeader("Access-Control-Allow-Headers", "Accept,Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,POST");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Allow", "OPTIONS,GET,POST");
  res.end();
}

function showOptionsPerResource(req, res, next) {
  res.setHeader("Access-Control-Allow-Headers", "Accept,Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,DELETE,PUT");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Allow", "OPTIONS,GET,DELETE,PUT");
  res.end();
}

/**
 * Verifica que la cabecera Accept sea válida, para los endpoints que retornan JSON
 *
 * Se considera válido si es que no se envia la cabecera Accept, en cuyo caso el servicio
 * asume que retorna el contenido que soporta por defecto.
 * Y se considera válida la cabecera `application/json`, cualquiera otra cabecera produce
 * no es válida,
 *
 * Se hace una consideración especial cuando la cabecera `application/json` viene acompañada
 * de otros posibles valores como en el caso `application/json;charset=utf-8` en cuyo caso primero
 * separan los posibles valores y sólo se busca `application/json`.
 *
 * @param {string} acceptHeader Valor de la cabecera Accept de la petición
 * @returns true si es que la cabecera es válida según los criterios expuestos más arriba, y
 * false si es que no cumple los criterios.
 */
function validAcceptHeader(acceptHeader) {
  if (!acceptHeader && acceptHeader !== "") {
    return true;
  }

  if (!(acceptHeader instanceof String || typeof acceptHeader === "string")) {
    return false;
  }

  const acceptedTypes = acceptHeader.split(";").map(h => h.trim());
  if (acceptedTypes.includes("application/json") || acceptedTypes.includes("*/*")) {
    return true;
  } else {
    return false;
  }
}

/**
 * Verifica que el header Content-Type tenga el valor `application/json`, considerando que el cliente puede enviar
 * otros valores posibles como `charset=utf-8`. Este método no considera válido los valores nulos, vacíos o de
 * otro tipo que disinto a string.
 *
 * @param {string} contentTypeHeader valor de la cabecera Content-Type de la petición.
 * @returns true si es que el Content-Type es válido o false en caso contrario.
 */
function validContentTypeHeader(contentTypeHeader) {
  if (!contentTypeHeader) {
    return false;
  }

  if (
    !(
      contentTypeHeader instanceof String ||
      typeof contentTypeHeader === "string"
    )
  ) {
    return false;
  }

  const contentTypes = contentTypeHeader.split(";").map(h => h.trim());
  if (contentTypes.includes("application/json")) {
    return true;
  } else {
    return false;
  }
}

/**
 * Obtiene todas las tareas de la base de datos
 *
 * @param {object} req Petición HTTP
 * @param {object} res Respuesta HTTP
 */
async function obtenerTareas(req, res, next) {
  const acceptHeader = req.header("Accept");
  if (!validAcceptHeader(acceptHeader)) {
    res.statusCode = 400;
    res.send({
      details:
        "This endpoint only support 'application/json' media type, please verify your `Accept` header ",
      message: `Media not supported :  ${acceptHeader}`
    });
    res.end();
    return;
  }
  const tareas = await tareasLogic.getAll();
  res.send(tareas);
  res.end();
}

/**
 * Crea una tarea en la base de datos y retorna el objeto creado con un
 * id válido.
 *
 * @param {object} req Petición HTTP
 * @param {object} res Respuesta HTTP
 */
async function crearTarea(req, res) {
  const contenTypeHeader = req.header("Content-Type");
  if (!validContentTypeHeader(contenTypeHeader)) {
    res.statusCode = 400;
    res.send({
      message: `Invalid Content-Type : ${contenTypeHeader}`,
      details: "This endpoint expected JSON object with attribute `description`"
    });
    res.end();
    return;
  }

  const jsonBody = req.body;

  // Validamos que si existe el atributo description, sea una cadena no vacía
  if (
    jsonBody.description &&
    !(
      jsonBody.description instanceof String ||
      typeof jsonBody.description === "string"
    )
  ) {
    res.statusCode = 400;
    res.send({
      message: `Invalid attribute "description"`,
      details: `The value ${description} for attribute "description" is invalid, it should be a non-empty string`
    });
    res.end();
    return;
  }

  const modeloACrear = {
    tipo:jsonBody.tipo,
    ciudad:jsonBody.ciudad,
    nombre_marca:jsonBody.nombre_marca,
    description: jsonBody.description,
    precio:jsonBody.precio,
    contacto:jsonBody.contacto,
    longitud:jsonBody.longitud,
    latitud:jsonBody.latitud,
    galeria:jsonBody.galeria,
    date: new Date(Date.now()) // Agregamos la fecha de creación del modelo
  };

  const tareaCreada = await tareasLogic.create(modeloACrear);
  res.send(tareaCreada);
  res.end();
}

/**
 * Obtiene una tarea dado su identificador idTarea
 *
 * @param {object} req Petición HTTP.
 * @param {object} res Respuesta HTTP.
 */
async function obtenerTarea(req, res) {
  const { idTarea } = req.params;
  try {
    const tarea = await tareasLogic.getOne(idTarea);
    res.send(tarea);
    res.end();
  } catch (error) {
    res.statusCode = 400;
    res.send({
      message: `Can't find objecti with id : ${idTarea}`,
      details: "This endpoint expected a valid object identifier"
    });
    res.end();
  }
}

async function actualizarTarea(req, res) {
  const contenTypeHeader = req.header("Content-Type");
  const acceptHeader = req.header("Accept");

  // Validar el Content-Type sea application/json
  if (!validContentTypeHeader(contenTypeHeader)) {
    res.statusCode = 400;
    res.send({
      message: `Invalid Content-Type : ${contenTypeHeader}`,
      details: "This endpoint expected JSON object with attribute `description`"
    });
    res.end();
    return;
  }

  // Validar el Accept sea application/json
  if (!validAcceptHeader(acceptHeader)) {
    res.statusCode = 400;
    res.send({
      details:
        "This endpoint only support 'application/json' media type, please verify your `Accept` header ",
      message: `Media not supported :  ${acceptHeader}`
    });
    res.end();
    return;
  }

  // Extraemos los atributos description y status del cupero del request (si existen)
  const { description, status } = req.body;

  // Validamos que si existe el atributo description sea una cadena no vacía
  if (
    description &&
    !(description instanceof String || typeof description === "string")
  ) {
    res.statusCode = 400;
    res.send({
      message: `Invalid attribute "description"`,
      details: `The value ${description} for attribute "description" is invalid, it should be a non-empty string`
    });
    res.end();
    return;
  }

  // Con el path param recibido
  const { idTarea } = req.params;

  // Validar que exista la tarea con dicho id
  let t;
  try {
    t = await tareasLogic.getOne(idTarea);
    delete t.id; // getOne retorna un campo adiconal id, que no queremos actualizar
  } catch (error) {
    res.statusCode = 400;
    res.send({
      message: `Can't find object with id : ${idTarea}`,
      details: "This endpoint expected a valid object identifier"
    });
    res.end();
    return;
  }

  // A partir del status recibido en el request.
  if (status) {
    // Y el status del objeto ya existente.
    const oldStatus = t.status;
    // Verificamos
    if (!["PENDIENTE", "TERMINADO", "CANCELADO"].includes(status)) {
      res.statusCode = 400;
      res.send({
        message: `Invalid Data`,
        details:
          "Invalid status, only accepted `PENDIENTE`, `TERMINADO`, `CANCELADO`. It is case sensitive!"
      });
      res.end();
      return;
    }

    // Lógica interna de actualizar tareas
    // Comparamos en el caso que no sean del mismo estado
    if (status !== oldStatus) {
      if (oldStatus === "PENDIENTE") {
        // Solo se puede pasar de PENDIENTE a TERMINADO o CANCELADO, no a otro status
        if (status !== "TERMINADO" && status !== "CANCELADO") {
          res.statusCode = 400;
          res.send({
            message: `Invalid Data`,
            details: `A Task with status '${oldStatus}' can only be transitioned to status 'TERMINADO' or status 'CANCELADO'`
          });
          res.end();
          return;
        }
      }

      // Si una tarea se pasó a TERMINADO no puede pasar directamente a CANCELADO y viceversa.
      if (
        (oldStatus === "TERMINADO" && status === "CANCELADO") ||
        (oldStatus === "CANCELADO" && status === "TERMINADO")
      ) {
        res.statusCode = 400;
        res.send({
          message: `Invalid Data`,
          details: `A Task with status '${oldStatus}' can't be transitioned to status '${status}' directly`
        });
        res.end();
        return;
      }
    }
    t.status = status;
  }

  if (description) {
    t.description = description;
  }

  t.date = new Date(Date.now());
  try {
    await tareasLogic.update(idTarea, t);
    // La tarea fue actualiazada, pero el método update de mongoose no retorna el objeto
    // por tanto haremos un segundo query para retornar la tarea actualizada
    const tareaActualizada = await tareasLogic.getOne(idTarea)
    res.send(tareaActualizada);
    res.end();
  } catch (error) {
    console.error(`Can't update Error: ${error.name} : ${error.message}`);
    res.statusCode = 400;
    res.send({
      message: `Can't update`,
      details: `A Task with id '${idTarea}' can't be udpated`
    });
    res.end();
    return;
  }
}

async function borrarTarea(req, res) {
  // Con el path param recibido
  const { idTarea } = req.params;

  // Validar que exista la tarea con dicho id
  let t;
  try {
    t = await tareasLogic.getOne(idTarea);
  } catch (error) {
    res.statusCode = 400;
    res.send({
      message: `Can't find object with id : ${idTarea}`,
      details: "This endpoint expected a valid object identifier"
    });
    res.end();
    return;
  }

  try {
    await tareasLogic.erase(idTarea);
    res.statusCode = 200;
    res.send({
      message: `Task deleted`,
      details: `The task with id ${idTarea} was successfully deleted`
    });
  } catch (error) {
    res.statusCode = 400;
    res.send({
      message: `Can't be deleted`,
      details: `Task with id ${idTarea} can't be deleted`
    });
    res.end();
    return;
  }
}

tareasRouter
  .route("/")
  .all(allRequest)
  .options(showOptions)
  .get(obtenerTareas)
  .post(crearTarea)
  .put((req, res, next) => {
    res.statusCode = 405;
    res.end("PUT method is not supported on /tasks");
  })
  .delete((req, res, next) => {
    res.statusCode = 405;
    res.end("DELETE method is not supported on /tasks");
  });

tareasRouter
  .route("/:idTarea")
  .all(allRequest)
  .options(showOptionsPerResource)
  .get(obtenerTarea)
  .post((req, res, next) => {
    res.statusCode = 405;
    res.end("POST operation is not suported on /tareas/" + req.params.idTarea);
  })
  .put(actualizarTarea)
  .delete(borrarTarea);

module.exports = tareasRouter;
