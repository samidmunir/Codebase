struct doubly_linked_list_node {
    int data;
    struct doubly_linked_list_node *next;
    struct doubly_linked_list_node *prev;
};

struct doubly_linked_list {
    struct doubly_linked_list_node *head;
    struct doubly_linked_list_node *tail;
    int pointer;
    int number_of_elements;
};

struct doubly_linked_list * initialize_doubly_linked_list();

struct doubly_linked_list * insert_head(struct doubly_linked_list *linked_list, int data);

struct doubly_linked_list * remove_head(struct doubly_linked_list *linked_list);

struct doubly_linked_list * insert_tail(struct doubly_linked_list *liked_list, int data);

struct doubly_linked_list * remove_tail(struct doubly_linked_list *linked_list);