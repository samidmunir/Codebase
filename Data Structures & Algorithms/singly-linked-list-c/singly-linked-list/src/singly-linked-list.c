#include "singly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

void print_singly_linked_list(struct singly_linked_list_node *head, int pointer) {
    printf("singly-linked-list: ");
    if (head == NULL || pointer < 0) {
        printf("HEAD -> NULL\n");
        return;
    } else {
        struct singly_linked_list_node *current_node = head;
        printf("HEAD -> ");
        while (current_node != NULL) {
            printf("%d -> ", current_node -> data);
            current_node = current_node -> next;
        }
        printf("NULL\n");
    }
}

void print_singly_linked_list_struct(struct singly_linked_list *linked_list) {
    print_singly_linked_list(linked_list -> head, linked_list -> pointer);
    printf("\tpointer: %d\n", linked_list -> pointer);
    printf("\tnumber_of_elements: %d\n", linked_list -> number_of_elements);
    printf("\tused memory: %lu bytes\n", (linked_list -> number_of_elements * sizeof(struct singly_linked_list_node)));
}

struct singly_linked_list * initialize_singly_linked_list() {
    printf("\ninitialize_singly_linked_list() called -->\n");
    struct singly_linked_list_node *head = (struct singly_linked_list_node *) malloc(sizeof(struct singly_linked_list_node));
    if (head == NULL) {
        printf("--<ERROR>-- memory allocation failure for head node.\n");
        return NULL;
    }
    struct singly_linked_list *singly_linked_list_struct = (struct singly_linked_list *) malloc(sizeof(struct singly_linked_list));
    if (singly_linked_list_struct == NULL) {
        printf("--<ERROR>-- memory allocation failure for singly linked-list struct.\n");
        return NULL;
    }
    singly_linked_list_struct -> head = head;
    singly_linked_list_struct -> pointer = -1;
    singly_linked_list_struct -> number_of_elements = 0;
    
    printf("\tsingly linked-list successfully initialized!\n");

    print_singly_linked_list_struct(singly_linked_list_struct);

    return singly_linked_list_struct;
}