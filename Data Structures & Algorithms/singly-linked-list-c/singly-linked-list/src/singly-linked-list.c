#include "singly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

void print_singly_linked_list(struct singly_linked_list_node *head) {
    printf("singly-linked-list: ");
    if (head == NULL) {
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
        return;
    }
}

void print_singly_linked_list_struct(struct singly_linked_list *linked_list) {}

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

    return singly_linked_list_struct;
}