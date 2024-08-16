const bcrypt = require("bcryptjs")
const User = require("../models/user.model")
const jwt = require("../utils/jwt")

function register(req, res){
    const {firstname, lastname, email, password} = req.body

    if(!email) return res.status(400).send({msg: "El email es Obligatorio."})
    if(!password) return res.status(400).send({msg: "La contraseña es Obligatoria."})

    const user = new User({
        firstname,
        lastname,
        email: email.toLowerCase(),
        role: "User",
        active: false
    })

    const salt = bcrypt.genSaltSync(10)
    const hashPassword = bcrypt.hashSync(password, salt)

    user.password = hashPassword

    user.save((error, userStorage) => {
        if (error){
            return res.status(400).send({msg: "Error al crear el usuario."})
        }
        res.status(200).send(userStorage)
    })
}

function login(req, res) {
    const { email, password } = req.body;

    // Validar que se han recibido los datos necesarios
    if (!email) return res.status(400).send({ msg: "El email es obligatorio." });
    if (!password) return res.status(400).send({ msg: "La contraseña es obligatoria." });

    const emailLowerCase = email.toLowerCase();

    // Buscar el usuario en la base de datos
    User.findOne({ email: emailLowerCase }, (error, userStore) => {
        if (error) {
            return res.status(500).send({ msg: "Error del Servidor." });
        }
        if (!userStore) {
            // Usuario no encontrado
            return res.status(400).send({ msg: "Usuario o Contraseña Incorrecta." });
        }

        // Comparar la contraseña
        bcrypt.compare(password, userStore.password, (bcryptError, check) => {
            if (bcryptError) {
                return res.status(500).send({ msg: "Error del Servidor." });
            }
            if (!check) {
                return res.status(400).send({ msg: "Usuario o Contraseña Incorrecta." });
            }
            if (!userStore.active) {
                return res.status(401).send({ msg: "Usuario no activo." });
            }

            // Generar tokens
            const accessToken = jwt.createAccessToken(userStore);
            const refreshToken = jwt.createRefreshToken(userStore);

            return res.status(200).send({
                access: accessToken,
                refresh: refreshToken
            });
        });
    });
}


function refreshAccessToken(req, res){
    const { token } = req.body

    if(!token) res.status(400).send({msg: "Error, token requerido."})

    const { user_id } = jwt.decoded(token)

    User.findOne({ _id: user_id }, (error, userStorage) => {
        if(error){
            res.status(500).send({msg: "Error del Servidor."})
        } else {
            res.status(200).send({
                accessToken: jwt.createAccessToken(userStorage)
            })
        }
    })
}

module.exports = {
    register,
    login,
    refreshAccessToken
}