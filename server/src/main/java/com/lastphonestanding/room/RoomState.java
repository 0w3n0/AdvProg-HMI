package com.lastphonestanding.room;

// IN_ROUND et ENDED ne servent à rien avant les Phases 2 et 5, mais
// autant fixer l'enum maintenant plutôt que d'y retoucher plus tard.
public enum RoomState {
    LOBBY,
    IN_ROUND,
    ENDED
}