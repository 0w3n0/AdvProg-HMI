package com.lastphonestanding.room;

public enum RoomState {
    LOBBY,    // on attend les joueurs
    IN_ROUND, // manche en cours
    ENDED     // manche finie, classement affiché ; l'hôte peut relancer
}
