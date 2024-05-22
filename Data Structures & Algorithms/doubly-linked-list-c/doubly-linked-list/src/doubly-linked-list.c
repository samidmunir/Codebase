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
        printf("HEAD <-> TAIL\n");
        return;
    } else {
        struct doubly_linked_list_node *current_node = linked_list -> head;
        printf("HEAD <-> ");
        while (current_node != NULL) {
            printf("%d <-> ", current_node -> data);
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

struct doubly_linked_list * initialize_doubly_linked_list() {
    printf("\ninitialize_doubly_linked_list() called -->\n");
    struct doubly_linked_list_node *head = (struct doubly_linked_list_node *) malloc(sizeof(struct doubly_linked_list_node));
    if (head == NULL) {
        printf("--<ERROR>-- memory allocation failure for head node.\n");
        return NULL;
    }
    head -> next = NULL;
    head -> prev = NULL;
    struct doubly_linked_list_node *tail = (struct doubly_linked_list_node *) malloc(sizeof(struct doubly_linked_list_node));
    if (tail == NULL) {
        printf("--<ERROR>-- memory allocation failure for tail node.\n");
        return NULL;
    }
    tail -> next = NULL;
    tail -> prev = NULL;
    struct doubly_linked_list *doubly_linked_list_struct = (struct doubly_linked_list *) malloc(sizeof(struct doubly_linked_list));
    if (doubly_linked_list_struct == NULL) {
        printf("--<ERROR>-- memory allocation failure for doubly linked-list struct.\n");
        return NULL;
    }
    doubly_linked_list_struct -> head = head;
    doubly_linked_list_struct -> tail = tail;
    doubly_linked_list_struct -> pointer = -1;
    doubly_linked_list_struct -> number_of_elements = 0;

    printf("\tdoubly linked-list successfully initialized.\n");
    
    print_doubly_linked_list_struct(doubly_linked_list_struct);

    return doubly_linked_list_struct;
}

struct doubly_linked_list * insert_head(struct doubly_linked_list *linked_list, int data) {
    printf("\ninsert_head(%d) called -->\n", data);
    if (is_empty(linked_list)) {
        linked_list -> head -> data = data;
        linked_list -> head -> next = NULL;
        linked_list -> head -> prev = NULL;
        linked_list -> tail = linked_list -> head;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    } else {
        struct doubly_linked_list_node *new_head = (struct doubly_linked_list_node *) malloc(sizeof(struct doubly_linked_list_node));
        new_head -> data = data;
        new_head -> next = linked_list -> head;
        linked_list -> head -> prev = new_head;
        linked_list -> head = new_head;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    }
    print_doubly_linked_list_struct(linked_list);
    
    return linked_list;
}