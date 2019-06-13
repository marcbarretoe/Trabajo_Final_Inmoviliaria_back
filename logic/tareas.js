const Tarea = require("../models/tarea");
const mongoose = require("mongoose");

/**
 * Crea un documento Tarea en la Base de datos.
 *
 * @param {object} tareaModel Objeto que se pretende crear.
 * @returns {Promise<Tarea>} Promise de Tarea creada.
 */
async function create(tareaModel) {
  const tarea = new Tarea(tareaModel);
  const tareaCreada = await tarea.save();
  console.info(`Tarea ${tareaCreada["_id"]} creada exitosamente.`);
  // Retornamos solo los atributos del modelo, más el atributo id = _id
  return {tareaCreada, id: tareaCreada["_id"] }; 
}

async function erase(id) {
  try {
    //await Tarea.remove({ _id: id }); // este método esta deprecado, preferimos deleteOne
    await Tarea.deleteOne({ _id: id }); // explicitamente eliminar la tarea con dicho id
    console.info(`Tarea borrada exitosamente de la base de datos`); // amigable mensaje
  } catch (error) {
    console.error(`Error al intentar borrar ${error.name} : ${error.message}`);
  }

  return;
}

async function getAll() {
  let tareas = await Tarea.find();
  // A todas las tareas les agregamos el atributo id = _id
  tareas = tareas.map(t => {
    return { ...t["_doc"], id: t["_id"] };
  });
  console.info(`Se obtuvieron ${tareas.length} tareas.`);
  return tareas;
}

async function getOne(id) {
  console.debug(`Obteniendo tarea con id ${id}`);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error(`This id ${id} is invalid`);
    throw new Error("Invalid object Id ");
  }
  try {
    const tarea = await Tarea.findById(`${id}`);
    console.info(`Se obtuvo la tarea con id ${tarea["_id"]}`);
    return { ...tarea["_doc"], id: tarea["_id"] };
  } catch (error) {
    console.error(
      `No se pudo obtener la tarea con id ${id}, detalles ${error}`
    );
    throw error;
  }
}

async function update(id, newValues) {
  try {
    console.debug(
      `Actualizando tarea con id ${id}, y valores ${JSON.stringify(newValues)}`
    );
    const updatedModel = await Tarea.updateOne({ _id: id }, newValues);
    return updatedModel;
  } catch (error) {
    console.error(
      `Error al intentar actualizar ${error.name} : ${error.message}`
    );
    throw new Error(`Error trying to update ${id}`);
  }
}

module.exports = {
  create,
  erase,
  getAll,
  getOne,
  update
};
