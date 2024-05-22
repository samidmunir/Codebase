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

void print_doubly_linked_list(struct doubly_linked_list *linked_list) {
    printf("doubly-linked-list: ");
    if (is_empty(linked_list)) {
        printf("HEAD -> TAIL\n");
        return;
    } else {
        struct doubly_linked_list_node *current_node = linked_list -> head;
        printf("HEAD -> ");
        while (current_node != NULL) {
            printf("%d -> ", current_node -> data);
            current_node = current_node -> next;
        }
        printf("TAIL\n");
    }
}

void print_doubly_linked_list_struct(struct doubly_linked_list *linked_list) {
    print_doubly_linked_list(linked_list);
    printf("\tpointer: %d\n", linked_list -> pointer);
    printf("\tnumber_of_elements: %d\n", linked_list -> number_of_elements);
    printf("\tused memory: %lu bytes\n", (linked_list -> number_of_elements * sizeof(struct doubly_linked_list_node)));
}