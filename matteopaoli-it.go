//Copyright 2016 Matteo Paoli - mttpla@gmail.com

package hello

import (
    "fmt"
    "net/http"
)

func init() {
    http.HandleFunc("/", handler)
}

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "Matteo Paoli - web site - 2016-11-07")
}
