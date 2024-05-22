#include "doubly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

bool is_empty(struct doubly_linked_list *linked_list) {
    if (linked_list -> head == NULL || linked_list -> pointer < 0) {
        return true;
    } else {
        return false;
    }
}