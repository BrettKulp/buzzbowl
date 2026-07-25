import React, { useEffect, useRef, useState} from "react";
import Phaser from "phaser";

import GameScene from "../phasergame/buzzbowl/src/game/scenes/Game.js";

const PhaserGame = () => {

    const gameInstanceRef = useState(null);
    const gameContainerRef = useRef(null);

    useEffect(() => {

        if (gameContainerRef.current && !gameInstanceRef.current){
            
        }
    })
};