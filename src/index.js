const crypto = require("crypto"); SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec, ec = new EC("secp256k1");
const { Block, Blockchain, Transaction, MyChain } = require("./app/models/Blockchain");

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");

const WS = require("ws");

const PORT = process.env.PORT || 3002;
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : ["ws://localhost:3000", "ws://localhost:3001"];
const MY_ADDRESS = process.env.MY_ADDRESS || "ws://localhost:3002";
const server = new WS.Server({ port: PORT });

let opened = [], connected = [];
let check = [];
let checked = [];
let checking = false;
let tempChain = new Blockchain();

console.log("Listening on PORT", PORT);

server.on("connection", async (socket, req) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);

        console.log(_message);

        switch(_message.type) {
            case "TYPE_REPLACE_CHAIN":
                const [ newBlock, newDiff ] = _message.data;

                const ourTx = [...MyChain.transactions.map(tx => JSON.stringify(tx))];
                const theirTx = [...newBlock.data.filter(tx => tx.from !== MINT_PUBLIC_ADDRESS).map(tx => JSON.stringify(tx))];
                const n = theirTx.length;

                if (newBlock.prevHash !== MyChain.getLastBlock().prevHash) {
                    for (let i = 0; i < n; i++) {
                        const index = ourTx.indexOf(theirTx[0]);

                        if (index === -1) break;
                        
                        ourTx.splice(index, 1);
                        theirTx.splice(0, 1);
                    }
                    if (
                        theirTx.length === 0 &&
                        SHA256(MyChain.getLastBlock().hash + newBlock.timestamp + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash &&
                        newBlock.hash.startsWith(Array(MyChain.difficulty + 1).join("0")) &&
                        Block.hasValidTransactions(newBlock, MyChain) &&
                        (parseInt(newBlock.timestamp) > parseInt(MyChain.getLastBlock().timestamp) || MyChain.getLastBlock().timestamp === "") &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        MyChain.getLastBlock().hash === newBlock.prevHash &&
                        (newDiff + 1 === MyChain.difficulty || newDiff - 1 === MyChain.difficulty)
                    ) {
                        MyChain.chain.push(newBlock);
                        MyChain.difficulty = newDiff;
                        MyChain.transactions = [...ourTx.map(tx => JSON.parse(tx))];
                    }
                } else if (!checked.includes(JSON.stringify([newBlock.prevHash, MyChain.chain[MyChain.chain.length-2].timestamp || ""]))) {
                    checked.push(JSON.stringify([MyChain.getLastBlock().prevHash, MyChain.chain[MyChain.chain.length-2].timestamp || ""]));

                    const position = MyChain.chain.length - 1;

                    checking = true;

                    sendMessage(produceMessage("TYPE_REQUEST_CHECK", MY_ADDRESS));

                    setTimeout(() => {
                        checking = false;

                        let mostAppeared = check[0];

                        check.forEach(group => {
                            if (check.filter(_group => _group === group).length > check.filter(_group => _group === mostAppeared).length) {
                                mostAppeared = group;
                            }
                        })

                        const group = JSON.parse(mostAppeared)

                        MyChain.chain[position] = group[0];
                        MyChain.transactions = [...group[1]];
                        MyChain.difficulty = group[2];

                        check.splice(0, check.length);
                    }, 5000);
                }

                break;

            case "TYPE_REQUEST_CHECK":
                opened.filter(node => node.address === _message.data)[0].socket.send(
                    JSON.stringify(produceMessage(
                        "TYPE_SEND_CHECK",
                        JSON.stringify([MyChain.getLastBlock(), MyChain.transactions, MyChain.difficulty])
                    ))
                );

                break;

            case "TYPE_SEND_CHECK":
                if (checking) check.push(_message.data);

                break;

            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;

                MyChain.addTransaction(transaction);

                break;

            case "TYPE_SEND_CHAIN":
                const { block, finished } = _message.data;

                if (!finished) {
                    tempChain.chain.push(block);
                } else {
                    tempChain.chain.push(block);
                    if (Blockchain.isValid(tempChain)) {
                        MyChain.chain = tempChain.chain;
                    }
                    tempChain = new Blockchain();
                }

                break;

            case "TYPE_REQUEST_CHAIN":
                const socket = opened.filter(node => node.address === _message.data)[0].socket;
                
                for (let i = 1; i < MyChain.chain.length; i++) {
                    socket.send(JSON.stringify(produceMessage(
                        "TYPE_SEND_CHAIN",
                        {
                            block: MyChain.chain[i],
                            finished: i === MyChain.chain.length - 1
                        }
                    )));
                }

                break;

            case "TYPE_REQUEST_INFO":
                opened.filter(node => node.address === _message.data)[0].socket.send(JSON.stringify(produceMessage(
                    "TYPE_SEND_INFO",
                    [MyChain.difficulty, MyChain.transactions]
                )));

                break;

            case "TYPE_SEND_INFO":
                [ MyChain.difficulty, MyChain.transactions ] = _message.data;
                
                break;

            case "TYPE_HANDSHAKE":
                const nodes = _message.data;

                nodes.forEach(node => connect(node))
        }
    });
})

async function connect(address) {
	if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
		const socket = new WS(address);

		socket.on("open", () => {
			socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS, ...connected])));

			opened.forEach(node => node.socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))));

			if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
				opened.push({ socket, address });
			}

			if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
				connected.push(address);
			}
		});

		socket.on("close", () => {
			opened.splice(connected.indexOf(address), 1);
			connected.splice(connected.indexOf(address), 1);
		});
	}
}

function produceMessage(type, data) {
	return { type, data };
}

function sendMessage(message) {
	opened.forEach(node => {
		node.socket.send(JSON.stringify(message));
	})
}

process.on("uncaughtException", err => console.log(err));

module.exports = { produceMessage, sendMessage };

PEERS.forEach(peer => connect(peer));

var intervalId = setInterval(function() {
    setTimeout(() => {
        console.log(MyChain);
    }, 2500);
}, 2500);

//Front-end

const path = require('path');
const express = require('express');
//const morgan = require('morgan');
const { engine } = require('express-handlebars');
const app = express();
const port = 8080;
const session = require('express-session');
const helpers = require('handlebars-helpers')();

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: 'my-coin-session',
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

//HTTP logger
// app.use(morgan('combined'));

//Connect database
const db = require('./config/db');
db.connect();

//Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Template engine
engine.helpers = helpers;
app.engine('hbs', engine({ 
  extname: '.hbs', 
  defaultLayout: 'main',
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, './resources/views'));

app.use(function (req, res, next) {
  res.locals.session = req.session;
  next();
});

const pageRouter = require('./routers/route');
pageRouter(app);

app.get('/', function (req, res) {
  res.redirect('/');
});

app.listen(process.env.PORT || port, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});