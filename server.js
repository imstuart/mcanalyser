const express = require('express');
const cors = require('cors');
const minecraftUtil = require('minecraft-server-util');
const NodeCache = require('node-cache');
const whois = require('whois');
const psl = require('psl');
const path = require('path');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(cors());
// get le cache pour trouver le nombre de joueur moyen mais a refaire 
const playerCache = new NodeCache({ stdTTL: 86400, checkperiod: 120 });
// useless atm 
async function getPlayerCount(serverIP, serverPort) {
    try {
        const response = await minecraftUtil.status(serverIP, serverPort);
        return {
            online: response.players.online,
            max: response.players.max,
        };
    } catch (error) {
        console.error(`Erreur lors de la requête vers le serveur Minecraft: ${error}`);
        return null;
    }
}

app.get('/players/:serverIP/:port', async (req, res) => {
    const serverIP = req.params.serverIP;
    const serverPort = parseInt(req.params.port, 10);
    const playerCount = await getPlayerCount(serverIP, serverPort);

    if (playerCount !== null) {
        res.json({
            serverIP,
            players: `${playerCount.online}/${playerCount.max}`,
        });
    } else {
        res.status(404).json({ error: 'Aucune donnée disponible pour ce serveur' });
    }
});

app.get('/whois/:domain', (req, res) => {
    let domain = req.params.domain;

    const parsedDomain = psl.parse(domain);
    if (parsedDomain.error) {
        return res.status(400).json({ error: 'Nom de domaine invalide' });
    }
    domain = parsedDomain.domain;
    whois.lookup(domain, function (err, data) {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la requête Whois' });
        }
        const creationDateMatch = data.match(/Creation Date:\s*(.*)/i) ||
                                  data.match(/Created On:\s*(.*)/i) ||
                                  data.match(/Registered On:\s*(.*)/i) ||
                                  data.match(/Domain Create Date:\s*(.*)/i) ||
                                  data.match(/Registration Time:\s*(.*)/i);

        const registrarMatch = data.match(/Registrar:\s*(.*)/i) ||
                               data.match(/Sponsoring Registrar:\s*(.*)/i);

        let creationDate = 'Indisponible';
        if (creationDateMatch) {
            creationDate = creationDateMatch[1].trim();
        }
        const registrar = registrarMatch ? registrarMatch[1].trim() : 'Indisponible';

        res.json({
            domain: domain,
            creationDate: creationDate,
            registrar: registrar,
        });
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`run port: ${PORT}`);
});